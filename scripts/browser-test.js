import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

// Run against a real WebGL renderer, using installed Chromium or Playwright's browser.
const executablePath =
  process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
await mkdir('test-results', { recursive: true });
let checks = 0;
function pass(name) {
  checks++;
  console.log(`PASS ${name}`);
}
let production;
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('request', (request) => requests.push(request.url()));
  const snapshot = () => page.evaluate(() => window.__islandLab.snapshot());
  await page.goto(`${base}/?demo=1`);
  await page.waitForFunction(() => window.__islandLab?.snapshot().demo);
  await page.screenshot({ path: 'test-results/overview.png' });
  assert.equal((await snapshot()).npcCount, 4);
  assert.equal((await snapshot()).pickableAnimals, 0);
  pass('Quiz Demo renders four NPCs; animal pick registry is empty');

  await page.locator('[data-label="S01"]').click();
  await page.waitForFunction(
    () => window.__islandLab.snapshot().view === 'S01' && window.__islandLab.snapshot().zoom > 1.6,
  );
  // Wait for the smooth camera transition to settle before pixel/drag assertions.
  await page.waitForTimeout(800);
  for (const id of ['Q01', 'Q02', 'Q03', 'Q04'])
    assert.ok(await page.locator(`[data-label="${id}"]`).isVisible());
  await page.screenshot({ path: 'test-results/s01-focus.png' });
  pass('3D label click focuses S01 with all four readable Q labels');

  await page.locator('[data-label="Q01"]').click();
  assert.ok((await snapshot()).dialog);
  assert.match(await page.locator('#dialog-title').textContent(), /Q01/);
  const modalState = await snapshot();
  await page.mouse.wheel(0, 600);
  await page.keyboard.press('+');
  await page.waitForTimeout(200);
  const duringModal = await snapshot();
  assert.ok(Math.abs(duringModal.zoom - modalState.zoom) < 0.01);
  assert.deepEqual(
    duringModal.target.map((n) => n.toFixed(2)),
    modalState.target.map((n) => n.toFixed(2)),
  );
  assert.notDeepEqual(duringModal.shark, modalState.shark);
  assert.match(
    await page
      .locator('#detail-dialog')
      .evaluate((el) => document.activeElement.closest('dialog')?.id),
    /detail-dialog/,
  );
  await page.keyboard.press('Escape');
  assert.equal((await snapshot()).dialog, false);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.label), 'Q01');
  pass(
    'NPC placeholder, modal scroll/key isolation, autonomous animation and Escape focus restoration',
  );

  await page.locator('[data-label="lecture"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Lecture/);
  assert.equal(await page.locator('#detail-dialog a, #detail-dialog iframe').count(), 0);
  await page.locator('#close-dialog').click();
  pass('Lecture opens an honest placeholder with no external course link or embedded player');

  const canvas = await page.locator('canvas').boundingBox();
  const beforeDrag = await snapshot();
  await page.mouse.move(canvas.x + canvas.width * 0.78, canvas.y + canvas.height * 0.58);
  await page.mouse.down();
  await page.mouse.move(canvas.x + canvas.width * 0.78 + 80, canvas.y + canvas.height * 0.58 + 30, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterDrag = await snapshot();
  assert.notDeepEqual(afterDrag.target, beforeDrag.target);
  assert.equal(afterDrag.dialog, false);
  pass('drag pans continuously without opening content');

  const beforeWheel = afterDrag.zoom;
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(500);
  assert.ok((await snapshot()).zoom > beforeWheel);
  await page.locator('#overview').click();
  await page.waitForFunction(
    () =>
      window.__islandLab.snapshot().view === 'overview' &&
      Math.abs(window.__islandLab.snapshot().zoom - 1) < 0.01,
  );
  pass('wheel zoom and return to overview');

  await page.locator('#mode-video').click();
  assert.equal((await snapshot()).npcCount, 0);
  assert.equal(await page.locator('[data-label^="Q"]').count(), 0);
  await page.locator('#explore').click();
  await page.waitForTimeout(800);
  await page.locator('[data-label="lecture"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Lecture/);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/video-only.png' });
  pass('video-only removes all NPC geometry/labels while retaining Lecture and shark');
  await page.locator('#mode-quiz').click();
  assert.equal((await snapshot()).npcCount, 4);
  await page.locator('[data-label="Q04"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Q04/);
  await page.keyboard.press('Escape');
  pass('mode rebuild keeps current scene pick targets functional');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#overview').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/narrow.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#explore').click();
  await page.waitForTimeout(700);
  await page.locator('[data-label="Q02"]').click();
  const box = await page.locator('dialog').boundingBox();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845);
  await page.keyboard.press('Escape');
  pass('narrow viewport remains operable and modal stays within viewport');

  await page.goto(base);
  await page.waitForFunction(() => window.__islandLab);
  assert.equal((await snapshot()).demo, false);
  assert.equal((await snapshot()).npcCount, 0);
  assert.equal(await page.locator('#demo-controls').isVisible(), false);
  assert.ok(await page.locator('.label-locked').isVisible());
  assert.equal(
    requests.filter((url) => /assignments\/S\d+\.json|course-videos\//.test(url)).length,
    0,
  );
  pass('default entry keeps empty-manifest curriculum locked and fetches no teaching material');
  assert.deepEqual(errors, []);
  pass('no browser JavaScript or console errors');

  production = await preview({
    base: '/~wildwolf/engineering-island-lab/',
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  await page.goto(
    `http://127.0.0.1:${production.httpServer.address().port}/~wildwolf/engineering-island-lab/?demo=1`,
  );
  await page.waitForSelector('#loading[hidden]', { state: 'attached' });
  assert.equal(await page.locator('[data-label^="Q"]').count(), 0);
  assert.equal(await page.locator('#demo-controls').isVisible(), false);
  assert.equal(await page.evaluate(() => typeof window.__islandLab), 'undefined');
  assert.ok(await page.locator('canvas').isVisible());
  pass('built site renders from Apache subdirectory; query cannot enable local Demo');
  assert.deepEqual(errors, []);
  console.log(`${checks} browser acceptance checks passed. Screenshots: test-results/`);
} finally {
  if (production) await new Promise((resolve) => production.httpServer.close(resolve));
  await browser.close();
  await server.close();
}
