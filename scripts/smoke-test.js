import assert from 'node:assert/strict';
import { readFile, cp, mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startDeploymentServer } from './deployment-server.js';
import { loadCourseConfig, loadManifest } from '../src/config.js';
import { createLectureLoader } from '../src/lecture-data.js';
import { createQuizLoader } from '../src/quiz-data.js';
import { createDemoQuizReader } from '../src/demo/quiz-fixture.js';

function assertFresh(response, name) {
  assert.match(
    response.headers.get('cache-control') ?? '',
    /no-cache|no-store|max-age=0(?:[,; ]|$)/,
    `${name} must revalidate on reload`,
  );
}

async function assert404(url) {
  const response = await fetch(url);
  assert.equal(response.status, 404, `missing path must be a real 404: ${url.pathname}`);
  assert.doesNotMatch(await response.text(), /<script\b[^>]*type="module"/);
}

/** Run unchanged production files plus disposable Lecture/Quiz fixture stages. */
export async function runSmokeTests({ startServer = startDeploymentServer } = {}) {
  const mountPath = '/~wildwolf/engineering-island-lab/';
  const root = resolve('dist');
  const stages = [];
  const server = await startServer({ root, mountPath });

  try {
    const pageUrl = new URL(server.baseUrl);
    assert.ok(pageUrl.pathname.endsWith(mountPath));
    const redirect = await fetch(pageUrl.href.slice(0, -1), { redirect: 'manual' });
    assert.ok(
      [301, 302, 307, 308].includes(redirect.status),
      'directory URL gets a trailing slash',
    );
    const response = await fetch(pageUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assertFresh(response, 'index.html');
    const html = await response.text();
    assert.match(html, /<script\b[^>]*type="module"/);
    assert.match(html, /rel="stylesheet"/);

    const references = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)];
    assert.ok(references.length >= 3, 'built HTML must reference JavaScript, CSS, and a favicon');
    for (const [, reference] of references) {
      assert.ok(reference.startsWith('./'), `asset must use a relative path: ${reference}`);
      const resourceUrl = new URL(reference, pageUrl);
      assert.ok(resourceUrl.pathname.startsWith(mountPath));
      const resource = await fetch(resourceUrl);
      assert.equal(resource.status, 200, `built asset must load: ${reference}`);
      const type = resource.headers.get('content-type');
      const expectedType = reference.endsWith('.js')
        ? /javascript/
        : reference.endsWith('.css')
          ? /text\/css/
          : /image\/svg\+xml/;
      assert.match(type, expectedType, 'a missing asset must not pass via an HTML fallback');
      assert.ok((await resource.arrayBuffer()).byteLength > 0);
    }

    // Include dynamically imported Quiz chunks, not only the entry HTML references.
    for (const file of await readdir(join(root, 'assets'))) {
      if (!/\.(?:js|css)$/.test(file)) continue;
      const asset = await fetch(new URL(`./assets/${file}`, pageUrl));
      assert.equal(asset.status, 200, file);
      assert.match(
        asset.headers.get('content-type'),
        file.endsWith('.js') ? /javascript/ : /text\/css/,
      );
      assert.match(asset.headers.get('cache-control') ?? '', /immutable/);
      assert.ok((await asset.arrayBuffer()).byteLength > 0);
    }
    for (const file of ['course-config.json', 'assignments/manifest.json']) {
      const json = await fetch(new URL(`./${file}`, pageUrl));
      assert.equal(json.status, 200);
      assert.match(json.headers.get('content-type'), /application\/json/);
      assertFresh(json, file);
    }
    for (const missing of [
      'missing.js',
      'assets/missing.css',
      'course-videos/S99.json',
      'assignments/S99.json',
      'missing-page/',
    ])
      await assert404(new URL(missing, pageUrl));
    const reloaded = await fetch(pageUrl, { cache: 'reload' });
    assert.equal(reloaded.status, 200);
    assert.equal(await reloaded.text(), html, 'direct entry and reload serve the same HTML');
    const notice = await fetch(new URL('./THIRD_PARTY_NOTICES.txt', pageUrl));
    assert.equal(notice.status, 200, 'runtime license notice is distributed');
    assert.ok((await notice.text()).trim());

    const expected = JSON.parse(
      await readFile(new URL('../public/course-config.json', import.meta.url), 'utf8'),
    );
    assert.deepEqual(await loadCourseConfig(pageUrl), expected);
    const manifest = await fetch(new URL('./assignments/manifest.json', pageUrl));
    assert.deepEqual(await manifest.json(), { schemaVersion: 1, units: [] });
    stages.push({ stage: 'formal-static', kind: server.kind, passed: true });
    console.log(
      `Static smoke passed (${server.kind}): relative HTML/all JS+CSS/favicon/JSON, direct entry/reload, cache and real 404 under a subdirectory.`,
    );
  } finally {
    await server.close();
  }

  // A disposable copy verifies real static JSON serving without changing public/
  // or the formal dist Manifest. No real material is copied into the test fixture.
  const staging = await mkdtemp(join(tmpdir(), 'island-lecture-smoke-'));
  let contentServer;
  try {
    await cp(root, staging, { recursive: true });
    await mkdir(join(staging, 'course-videos'), { recursive: true });
    await writeFile(
      join(staging, 'course-config.json'),
      JSON.stringify({
        courseTitle: 'Lecture smoke fixture',
        totalUnits: 1,
        assignmentMode: 'video-only',
      }),
    );
    await writeFile(
      join(staging, 'assignments/manifest.json'),
      JSON.stringify({
        schemaVersion: 1,
        units: [{ unitId: 'S01', title: 'Fixture', file: 'S01.json' }],
      }),
    );
    const lecture = {
      unitId: 'S01',
      title: 'Fixture only',
      videos: [
        { title: '第二部在前', url: 'https://youtu.be/abcdefghijk?t=42' },
        { title: '第一部在後', url: 'https://www.youtube.com/watch?v=zyxwvutsrqp' },
      ],
    };
    await writeFile(join(staging, 'course-videos/S01.json'), JSON.stringify(lecture));
    contentServer = await startServer({ root: staging, mountPath });
    const baseUrl = new URL(contentServer.baseUrl);
    const course = await loadCourseConfig(baseUrl),
      manifest = await loadManifest(baseUrl, course.totalUnits);
    const loader = createLectureLoader({ baseUrl, totalUnits: course.totalUnits, manifest });
    assert.deepEqual(await loader.load('S01'), lecture);
    const lectureHttp = await fetch(new URL('./course-videos/S01.json', baseUrl));
    assert.equal(lectureHttp.status, 200);
    assert.match(lectureHttp.headers.get('content-type'), /application\/json/);
    assertFresh(lectureHttp, 'course-videos/S01.json');
    await assert404(new URL('./assignments/S01.json', baseUrl));
    stages.push({ stage: 'video-only-lecture', kind: contentServer.kind, passed: true });
    console.log(
      'Lecture smoke passed: temporary video-only fixture loads course-videos/S01.json in original order under the Apache subdirectory; formal files unchanged.',
    );
    await contentServer.close();
    contentServer = null;
    // Prepare before starting the next server: a Docker factory may copy a
    // static snapshot rather than bind-mount live files from the host.
    const units = await Promise.all(['S01', 'S02', 'S15'].map(createDemoQuizReader()));
    const quizManifest = {
      schemaVersion: 1,
      units: units.map((unit) => ({
        unitId: unit.unitId,
        title: unit.title,
        file: `${unit.unitId}.json`,
      })),
    };
    for (const unit of units)
      await writeFile(join(staging, `assignments/${unit.unitId}.json`), JSON.stringify(unit));
    await writeFile(join(staging, 'assignments/manifest.json'), JSON.stringify(quizManifest));
    await writeFile(
      join(staging, 'course-config.json'),
      JSON.stringify({
        courseTitle: 'Quiz smoke fixture',
        totalUnits: 15,
        assignmentMode: 'quiz',
      }),
    );
    contentServer = await startServer({ root: staging, mountPath });
    const quizBaseUrl = new URL(contentServer.baseUrl);
    const published = await loadManifest(quizBaseUrl, 15);
    assert.deepEqual(published, quizManifest, 'the Quiz stage serves its complete Manifest');
    let quizRequests = 0;
    const quiz = createQuizLoader({
      baseUrl: quizBaseUrl,
      totalUnits: 15,
      manifest: published,
      fetchImpl: (...args) => {
        quizRequests++;
        return fetch(...args);
      },
    });
    assert.deepEqual(await Promise.all(['S01', 'S02', 'S15'].map((id) => quiz.load(id))), units);
    const beforeLocked = quizRequests;
    await assert.rejects(quiz.load('S03'), { code: 'LOCKED' });
    assert.equal(quizRequests, beforeLocked, 'locked unit rejected without an HTTP request');
    for (const unit of units) {
      const resource = await fetch(new URL(`./assignments/${unit.unitId}.json`, quizBaseUrl));
      assert.equal(resource.status, 200);
      assert.match(resource.headers.get('content-type'), /application\/json/);
      assertFresh(resource, 'assignment JSON');
    }
    stages.push({ stage: 'quiz-v1-v2-s15', kind: contentServer.kind, passed: true });
    console.log(
      'Quiz smoke passed: real static HTTP v1/v2 four/five and S15 fixed relative JSON paths, with unpublished S03 blocked before fetch; formal files unchanged.',
    );
  } finally {
    if (contentServer) await contentServer.close();
    await rm(staging, { recursive: true, force: true });
  }

  return { ok: true, stages };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await runSmokeTests();
