import assert from 'node:assert/strict';
import { readFile, cp, mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';
import { loadCourseConfig, loadManifest } from '../src/config.js';
import { createLectureLoader } from '../src/lecture-data.js';
import { createQuizLoader } from '../src/quiz-data.js';
import { createDemoQuizReader } from '../src/demo/quiz-fixture.js';

// Mount the unchanged dist/ under an Apache-style user directory.
const mountPath = '/~wildwolf/engineering-island-lab/';
const server = await preview({
  base: mountPath,
  preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
});

try {
  const pageUrl = new URL(mountPath, `http://127.0.0.1:${server.httpServer.address().port}`);
  const response = await fetch(pageUrl);
  assert.equal(response.status, 200);
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

  const expected = JSON.parse(
    await readFile(new URL('../public/course-config.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(await loadCourseConfig(pageUrl), expected);
  const manifest = await fetch(new URL('./assignments/manifest.json', pageUrl));
  assert.deepEqual(await manifest.json(), { schemaVersion: 1, units: [] });
  console.log(
    'Smoke test passed: built HTML, JavaScript, CSS, favicon, and JSON load under an Apache-style subdirectory.',
  );
} finally {
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}

// A disposable copy verifies real static JSON serving without changing public/
// or the formal dist Manifest. No real material is copied into the test fixture.
const staging = await mkdtemp(join(tmpdir(), 'island-lecture-smoke-'));
let contentServer;
try {
  await cp(new URL('../dist/', import.meta.url), staging, { recursive: true });
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
  contentServer = await preview({
    base: mountPath,
    build: { outDir: staging },
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  const baseUrl = new URL(mountPath, `http://127.0.0.1:${contentServer.httpServer.address().port}`);
  const course = await loadCourseConfig(baseUrl),
    manifest = await loadManifest(baseUrl, course.totalUnits);
  const loader = createLectureLoader({ baseUrl, totalUnits: course.totalUnits, manifest });
  assert.deepEqual(await loader.load('S01'), lecture);
  await assert.rejects(access(join(staging, 'assignments/S01.json')), { code: 'ENOENT' });
  console.log(
    'Lecture smoke passed: temporary video-only fixture loads course-videos/S01.json in original order under the Apache subdirectory; formal files unchanged.',
  );
  // Reuse the disposable HTTP directory for v1/v2 and S15 quiz file paths.
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
  const published = await loadManifest(baseUrl, 15);
  const quiz = createQuizLoader({ baseUrl, totalUnits: 15, manifest: published });
  assert.deepEqual(await Promise.all(['S01', 'S02', 'S15'].map((id) => quiz.load(id))), units);
  await assert.rejects(quiz.load('S03'), { code: 'LOCKED' });
  console.log(
    'Quiz smoke passed: real static HTTP v1/v2 four/five and S15 fixed relative JSON paths, with unpublished S03 blocked before fetch; formal files unchanged.',
  );
} finally {
  if (contentServer) await new Promise((resolve) => contentServer.httpServer.close(resolve));
  await rm(staging, { recursive: true, force: true });
}
