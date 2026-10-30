import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createDemoQuizReader } from '../src/demo/quiz-fixture.js';

export async function checkQuiz(parent, base, productionBase, pass) {
  await parent.goto('about:blank');
  const context = await parent
    .context()
    .browser()
    .newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [],
    requests = [],
    external = [],
    metrics = [],
    layouts = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // This helper deliberately returns HTTP404 for S01 in its failure case.
    if (message.type() === 'error' && !/^Failed to load resource:.*404/.test(message.text()))
      errors.push(message.text());
  });
  page.on('request', (request) => requests.push(request.url()));
  const providers =
    /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|forms\.gle|docs\.google\.com)\//;
  const intercept = (route) => {
    if (route.request().isNavigationRequest())
      external.push({
        url: route.request().url(),
        referer: route.request().headers().referer ?? null,
      });
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Intercepted synthetic link</title><p>No provider contacted; no submission.</p>',
    });
  };
  await context.route(providers, intercept);
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const settle = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.003 &&
        s.target.every((n, i) => Math.abs(n - s.goalTarget[i]) < 0.005)
      );
    });
  const load = async (query = '?demo=1&units=12&open=4') => {
    await page.goto(`${base}/${query}`);
    await page.waitForFunction(() => window.__islandLab);
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await settle();
  };
  const label = (unit, id) => `[data-label="${unit === 'S01' ? id : unit + '-' + id}"]`;
  const open = async (unit, id) => {
    if ((await state()).view !== unit) await focus(unit);
    else await settle();
    await page.locator(label(unit, id)).click();
    await page.waitForSelector('.quiz-content');
    assert.equal(
      await page.locator('.dialog-scroll').evaluate((node) => node.scrollTop),
      0,
      'each newly opened Quiz starts at its title, including completed reviews after scrolling',
    );
  };
  const close = async () => {
    await page.keyboard.press('Escape');
    await page.waitForSelector('#detail-dialog', { state: 'hidden' });
  };
  const submit = async (choice) => {
    await page.locator(`input[name="quiz-answer"][value="${choice}"]`).check();
    await page.locator('.quiz-submit').click();
  };
  const session = async (id) => (await state()).quizSessions.find((s) => s.unitId === id);
  const shot = (name) => page.screenshot({ path: `test-results/quiz-${name}.png` });
  async function popup(selector) {
    const a = page.locator(selector),
      href = await a.getAttribute('href');
    assert.equal(await a.getAttribute('target'), '_blank');
    const rel = (await a.getAttribute('rel')).split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
    const before = await state();
    const [tab] = await Promise.all([context.waitForEvent('page'), a.click()]);
    await tab.waitForLoadState();
    assert.equal(tab.url(), href);
    assert.equal(await tab.evaluate(() => window.opener === null), true);
    await tab.close();
    await page.bringToFront();
    assert.equal((await state()).dialog, before.dialog);
    assert.deepEqual((await state()).quizSessions, before.quizSessions);
    assert.equal(external.at(-1).referer, null);
  }
  try {
    await page.setViewportSize({ width: 1366, height: 768 });
    await load();
    assert.equal((await state()).npcCount, 18);
    assert.deepEqual((await state()).quizSessions.map((s) => [s.unitId, s.total]).sort(), [
      ['S01', 4],
      ['S02', 5],
      ['S03', 4],
      ['S04', 5],
    ]);
    assert.equal(await page.locator('[data-label="Q05"]').count(), 0);
    assert.deepEqual((await state()).quizFailures, []);
    await focus('S01');
    await shot('S01-four-npcs');
    await focus('S02');
    await page.waitForSelector('[data-label="S02-Q05"]');
    assert.equal(await page.locator('[data-label="S02-Q05"]').count(), 1);
    await shot('S02-five-npcs');
    pass('validated per-island assignments create mixed four/five NPCs with no nonexistent Q05');

    await open('S01', 'Q01');
    assert.match(await page.locator('#dialog-title').textContent(), /^S01 · Q01/);
    assert.equal(await page.locator('input[name="quiz-answer"]').count(), 4);
    assert.equal(await page.locator('input[type="checkbox"]').count(), 0);
    assert.equal(await page.locator('.quiz-explanation-video,.quiz-form-link').count(), 0);
    assert.equal(
      (await state()).npcs.find((n) => n.unitId === 'S01' && n.id === 'Q01').paused,
      true,
    );
    await shot('unanswered');
    assert.equal(external.length, 0, 'opening the question never navigates externally');
    await popup('.quiz-question-video');
    await submit('B');
    assert.equal((await session('S01')).count, 0);
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-result'), 'incorrect');
    assert.equal(await page.locator('.quiz-explanation-video').count(), 0);
    await page.locator('.quiz-feedback').scrollIntoViewIfNeeded();
    await shot('retry');
    await submit('A');
    assert.equal((await session('S01')).count, 1);
    assert.equal(await page.locator('.quiz-explanation-video').count(), 1);
    assert.match(await page.locator('.quiz-explanation-text').textContent(), /合成解說/);
    await page.locator('.quiz-explanation').scrollIntoViewIfNeeded();
    await shot('explanation');
    await popup('.quiz-explanation-video');
    await close();
    await page.waitForFunction(
      () =>
        !window.__islandLab.snapshot().npcs.find((n) => n.unitId === 'S01' && n.id === 'Q01')
          .paused,
    );
    assert.match(await page.locator(label('S01', 'Q01')).textContent(), /✓/);
    assert.ok(
      await page.locator(label('S01', 'Q01')).evaluate((e) => e.classList.contains('is-complete')),
    );
    await shot('partial');
    pass(
      'v1 question video, wrong retry, correct explanation, safe popups and green marker preserve pause/resume',
    );

    await open('S01', 'Q02');
    await submit('B');
    await close();
    await open('S01', 'Q03');
    await submit('A');
    assert.equal((await session('S01')).count, 2);
    await submit('C');
    assert.equal((await session('S01')).count, 3);
    assert.equal(await page.locator('.quiz-form-link').count(), 0);
    await close();
    await open('S01', 'Q01');
    await submit('B');
    assert.equal((await session('S01')).count, 3);
    assert.equal(await page.locator('.quiz-explanation-video').count(), 1);
    await close();
    await open('S01', 'Q04');
    await submit('D');
    assert.equal((await session('S01')).complete, true);
    assert.equal((await session('S01')).count, 4);
    assert.equal(
      await page.locator('.quiz-form-link').getAttribute('href'),
      'https://forms.gle/IslandLabDemoS01',
    );
    await page.locator('.quiz-completion').scrollIntoViewIfNeeded();
    await shot('four-complete');
    await popup('.quiz-form-link');
    await close();
    assert.equal(
      await page.locator('#quiz-status a').getAttribute('href'),
      'https://forms.gle/IslandLabDemoS01',
    );
    await popup('#quiz-status a');
    await shot('all-green');
    pass(
      '3/4 stays locked, 4/4 unlocks exact Form inside Modal and compact navigation; wrong review retains passes',
    );

    await open('S02', 'Q01');
    assert.equal(await page.locator('input[name="quiz-answer"]').count(), 3);
    await submit('C');
    assert.equal((await session('S02')).count, 1);
    await close();
    await open('S02', 'Q01');
    await submit('A');
    assert.equal((await session('S02')).count, 1);
    await page.locator('.quiz-feedback').scrollIntoViewIfNeeded();
    await shot('v2-alternatives');
    await close();
    for (const id of ['Q02', 'Q03', 'Q04']) {
      await open('S02', id);
      await submit('A');
      await close();
    }
    assert.equal((await session('S02')).count, 4);
    assert.equal((await session('S02')).complete, false);
    assert.equal(await page.locator('#quiz-status a').count(), 0);
    await open('S02', 'Q05');
    await submit('C');
    assert.equal((await session('S02')).count, 5);
    assert.equal(
      await page.locator('.quiz-form-link').getAttribute('href'),
      'https://forms.gle/IslandLabDemoS02',
    );
    await page.locator('.quiz-completion').scrollIntoViewIfNeeded();
    await shot('five-complete');
    await close();
    for (const id of ['Q01', 'Q02', 'Q03', 'Q04']) {
      await open('S03', id);
      await submit('C');
      await close();
    }
    assert.equal((await session('S03')).complete, true);
    assert.equal((await session('S01')).count, 4);
    assert.equal((await session('S02')).count, 5);
    pass(
      'v2 A or C individually passes a single radio choice; three-choice/four-question and five-question Forms remain independent',
    );

    await focus('S01');
    const canvas = await page.locator('canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width * 0.8, canvas.y + canvas.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width * 0.8 + 110, canvas.y + canvas.height * 0.7, {
      steps: 6,
    });
    await page.mouse.up();
    await page.mouse.wheel(0, 120);
    await settle();
    await page.locator('#day-night').click();
    await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
    assert.equal((await session('S01')).complete, true);
    await open('S01', 'Q01');
    await shot('night');
    const before = await state();
    await page.keyboard.press('Home');
    await page.keyboard.press('+');
    await page.mouse.wheel(0, 400);
    const after = await state();
    assert.equal(after.azimuthGoal, before.azimuthGoal);
    assert.equal(after.goalZoom, before.goalZoom);
    assert.deepEqual(after.goalTarget, before.goalTarget);
    await close();
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await open('S01', 'Q01');
      const m = await page.evaluate(() => {
        const d = document.querySelector('dialog').getBoundingClientRect(),
          s = document.querySelector('.dialog-scroll');
        const close = document.querySelector('#close-dialog').getBoundingClientRect();
        return {
          width: innerWidth,
          height: innerHeight,
          x: d.x,
          y: d.y,
          right: d.right,
          bottom: d.bottom,
          bodySize: parseFloat(getComputedStyle(document.querySelector('.quiz-content')).fontSize),
          titleSize: parseFloat(getComputedStyle(document.querySelector('#dialog-title')).fontSize),
          optionSize: parseFloat(getComputedStyle(document.querySelector('.quiz-option')).fontSize),
          close: [close.width, close.height],
          internalScroll: s.scrollHeight > s.clientHeight,
          overflow:
            s.scrollWidth > s.clientWidth + 1 ||
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight,
        };
      });
      assert.ok(m.x >= 11 && m.y >= 11 && m.right <= width - 11 && m.bottom <= height - 11);
      assert.ok(m.bodySize >= (width === 390 ? 16 : 18));
      assert.equal(m.titleSize, width === 390 ? 24 : 28);
      assert.ok(m.close.every((n) => n >= 44));
      assert.equal(m.overflow, false);
      layouts.push(m);
      await shot(String(width));
      await close();
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await load();
    assert.ok((await state()).quizSessions.every((s) => s.count === 0));
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.deepEqual(await context.cookies(), []);
    assert.equal(await page.evaluate(async () => (await indexedDB.databases()).length), 0);
    pass(
      'camera/night retain independent progress; readable three-size Modals fit internally; reload clears all page-only progress',
    );

    const beforeVideo = requests.length;
    await load('?demo=1&units=15&open=15&mode=video-only');
    const videoRequests = requests.slice(beforeVideo);
    assert.equal((await state()).npcCount, 0);
    assert.equal((await state()).animals.length, 45);
    assert.equal((await state()).quiz, null);
    assert.deepEqual((await state()).quizSessions, []);
    assert.equal(await page.locator('#quiz-status').isVisible(), false);
    assert.equal(
      videoRequests.some((url) =>
        /assignments\/S\d{2}\.json|\/src\/quiz[.-]|\/src\/demo\/quiz-|\/src\/legacy-assignment|quiz-runtime/.test(
          url,
        ),
      ),
      false,
    );
    await focus('S02');
    await shot('video-only');
    await page.locator('[data-label="S02-lecture"]').click();
    await page.waitForSelector('.lecture-video-link');
    assert.equal(await page.locator('.lecture-video-link').count(), 4);
    await close();
    pass(
      'Video-only loads neither Quiz modules nor assignments/UI, preserving Lecture, 45 animals and all background life',
    );

    // Official-format HTTP fixtures are intercepted only; public/ stays untouched.
    let course = { courseTitle: '合成 Quiz 正式載入測試', totalUnits: 15, assignmentMode: 'quiz' };
    const read = createDemoQuizReader();
    let manifest = { schemaVersion: 1, units: [] };
    const responses = new Map();
    for (const id of ['S01', 'S02', 'S13', 'S14', 'S15']) {
      const unit = await read(id);
      responses.set(id, { body: JSON.stringify(unit), status: 200 });
      manifest.units.push({ unitId: id, title: unit.title, file: `${id}.json` });
    }
    const assignmentRequests = [];
    let gate = null;
    const courseRoute = (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(course) });
    const manifestRoute = (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(manifest),
      });
    const assignmentRoute = async (route) => {
      const id = route
        .request()
        .url()
        .match(/(S\d{2})\.json$/)[1];
      assignmentRequests.push(route.request().url());
      if (gate && id === 'S01') await gate.promise;
      const response = responses.get(id) ?? { status: 404, body: '{}' };
      await route.fulfill({ ...response, contentType: 'application/json' }).catch(() => {});
    };
    await page.route('**/course-config.json', courseRoute);
    await page.route('**/assignments/manifest.json', manifestRoute);
    await page.route(/\/assignments\/S\d{2}\.json$/, assignmentRoute);
    try {
      await load('');
      assert.equal((await state()).npcCount, 22);
      assert.ok(assignmentRequests.every((url) => /S(?:01|02|13|14|15)\.json$/.test(url)));
      assert.equal(new Set(assignmentRequests).size, 5);
      assert.equal((await state()).npcs.filter((n) => n.unitId === 'S14').length, 5);
      await open('S14', 'Q05');
      await submit('C');
      await close();
      assert.equal((await session('S14')).count, 1);
      pass(
        'official allowlist loads only published files, validates S13–S15 and maps each real question to its own NPC',
      );

      responses.set('S01', { status: 404, body: '{}' });
      responses.set('S02', { status: 200, body: '{broken json' });
      const bad = await read('S13');
      bad.questions[0].questionVideoUrl = 'https://evil.invalid/watch?v=abcdefghijk';
      responses.set('S13', { status: 200, body: JSON.stringify(bad) });
      await load('');
      assert.equal((await state()).npcCount, 9);
      assert.equal((await state()).quizFailures.length, 3);
      assert.equal(
        (await state()).npcs.some((n) => ['S01', 'S02', 'S13'].includes(n.unitId)),
        false,
      );
      assert.equal((await state()).mode, 'quiz');
      await focus('S02');
      await page.locator('#quiz-status button').click();
      assert.match(await page.locator('#dialog-content').textContent(), /JSON/);
      await shot('load-error');
      await close();
      await open('S14', 'Q01');
      await submit('A');
      await close();
      assert.equal((await session('S14')).count, 1);
      pass(
        'HTTP/JSON/contract failures show explicit Quiz errors without fake NPCs or contaminating valid islands',
      );

      responses.set('S01', { status: 200, body: JSON.stringify(await read('S01')) });
      responses.set('S02', { status: 200, body: JSON.stringify(await read('S02')) });
      gate = {};
      gate.promise = new Promise((resolve) => {
        gate.release = resolve;
      });
      const slowNavigation = page.goto(`${base}/`);
      await page.waitForTimeout(150);
      await slowNavigation;
      // Navigate away before the old assignment resolves. It must not create an NPC in the new Video-only document.
      course = { ...course, assignmentMode: 'video-only' };
      await page.goto(`${base}/`);
      await page.waitForFunction(() => window.__islandLab);
      gate.release();
      gate = null;
      await page.waitForTimeout(300);
      assert.equal((await state()).mode, 'video-only');
      assert.equal((await state()).npcCount, 0);
      assert.deepEqual((await state()).quizSessions, []);
      pass(
        'late assignment responses from an abandoned document cannot leak Quiz state into a newer Video-only world',
      );

      course = { ...course, assignmentMode: 'quiz' };
      const productionUnit = await read('S15');
      productionUnit.schemaVersion = 1;
      for (const question of productionUnit.questions) {
        delete question.correctOptions;
        question.correctOption = 'A';
        question.options = ['A', 'B', 'C', 'D'];
        question.prompt = '合成 v1 HTTP 測試，只有 A 通過；不是正式教材。';
      }
      responses.set('S15', { status: 200, body: JSON.stringify(productionUnit) });
      manifest = {
        schemaVersion: 1,
        units: [{ unitId: 'S15', title: (await read('S15')).title, file: 'S15.json' }],
      };
      const productionStart = requests.length;
      await page.goto(productionBase + '?demo=1&units=1&open=15&questions=5&mode=video-only');
      await page.waitForSelector('#loading[hidden]', { state: 'attached' });
      assert.equal(await page.evaluate(() => typeof window.__islandLab), 'undefined');
      assert.equal(await page.locator('.label-locked').count(), 14);
      assert.equal(await page.locator('[data-label="S15-Q05"]').count(), 0);
      await page.selectOption('#unit-navigation', 'S15');
      await page.waitForTimeout(1400);
      assert.equal(await page.locator('.label-question').count(), 4);
      await page.locator('[data-label="S15-Q01"]').click();
      await page.waitForSelector('.quiz-content');
      await submit('C');
      assert.equal(
        await page.locator('.quiz-explanation-video').count(),
        0,
        'S15 is v1 and only A passes Q01',
      );
      await submit('A');
      assert.equal(await page.locator('.quiz-explanation-video').count(), 1);
      assert.ok(
        requests
          .slice(productionStart)
          .some(
            (url) =>
              new URL(url).pathname === '/~wildwolf/engineering-island-lab/assignments/S15.json',
          ),
      );
      await shot('apache-production');
      await close();
      course = { ...course, assignmentMode: 'video-only' };
      await page.goto(productionBase + '?demo=1&mode=quiz');
      await page.waitForSelector('#loading[hidden]', { state: 'attached' });
      const resources = await page.evaluate(() =>
        performance.getEntriesByType('resource').map((entry) => entry.name),
      );
      assert.equal(
        resources.some((url) => /quiz-runtime|assignments\/S\d{2}\.json/.test(url)),
        false,
      );
      assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
      pass(
        'Apache production uses exact nested assignment path and official v1 S15 data, ignoring every Demo/mode/count override',
      );
    } finally {
      gate?.release();
      await page.unroute('**/course-config.json', courseRoute);
      await page.unroute('**/assignments/manifest.json', manifestRoute);
      await page.unroute(/\/assignments\/S\d{2}\.json$/, assignmentRoute);
    }

    for (const [name, query, view, night] of [
      ['12-quiz', '?demo=1&units=12&open=12', 'overview', false],
      ['15-quiz', '?demo=1&units=15&open=15', 'overview', false],
      ['15-quiz-focus', '?demo=1&units=15&open=15', 'S02', false],
      ['15-quiz-night', '?demo=1&units=15&open=15', 'overview', true],
      ['15-video-only', '?demo=1&units=15&open=15&mode=video-only', 'overview', false],
    ]) {
      await load(query);
      if (view !== 'overview') await focus(view);
      if (night) {
        await page.locator('#day-night').click();
        await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
      }
      const sample = await page.evaluate(async () => {
        const samples = [];
        let last = performance.now();
        for (let i = 0; i < 20; i++) {
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          samples.push(now - last);
          last = now;
        }
        const s = window.__islandLab.snapshot();
        const gl = document.querySelector('canvas').getContext('webgl2'),
          ext = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          fps: 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
          frameMs: samples,
          drawCalls: s.drawCalls,
          triangles: s.triangles,
          npcCount: s.npcCount,
          animals: s.animals.length,
          whales: s.sea.whales.length,
          visitors: s.visitors.length,
          gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        };
      });
      metrics.push({ name, viewport: [1366, 768], ...sample });
    }
    await load('');
    assert.equal((await state()).npcCount, 0);
    assert.equal((await state()).gates.length, 12);
    await shot('empty-manifest');
    assert.deepEqual(errors, []);
    pass(
      'mixed-count 12/15 overview, focus, Night and Video-only performance recorded; real empty Manifest remains locked',
    );
    assert.ok(external.length === 4, 'only four explicit external link actions occurred');
    await writeFile(
      'test-results/quiz-audit.json',
      JSON.stringify({ layouts, metrics, external, requests, errors }, null, 2) + '\n',
    );
  } finally {
    await context.unroute(providers, intercept);
    await context.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { chromium } = await import('playwright');
  const { createServer, preview } = await import('vite');
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
  await server.listen();
  const production = await preview({
    base: '/~wildwolf/engineering-island-lab/',
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  await mkdir('test-results', { recursive: true });
  const page = await browser.newPage();
  let count = 0;
  try {
    await checkQuiz(
      page,
      `http://127.0.0.1:${server.httpServer.address().port}`,
      `http://127.0.0.1:${production.httpServer.address().port}/~wildwolf/engineering-island-lab/`,
      (name) => console.log(`PASS ${++count} ${name}`),
    );
  } finally {
    await browser.close();
    await server.close();
    await new Promise((resolve) => production.httpServer.close(resolve));
  }
}
