import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { checkArchipelago } from './archipelago-browser.js';
import { checkBackgroundLife } from './life-browser.js';
import { checkModalReadability } from './modal-browser.js';
import { checkPhase25 } from './phase25-browser.js';
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
let checks = 0,
  production;
const pass = (name) => console.log(`PASS ${++checks} ${name}`);
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('request', (r) => requests.push(r.url()));
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const load = async (query) => {
    await page.goto(`${base}/${query}`);
    await page.waitForFunction(() => window.__islandLab);
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await page.waitForFunction((expected) => window.__islandLab.snapshot().view === expected, id);
    await page.waitForTimeout(1400);
  };
  await load('?demo=1&units=1&open=1');
  assert.equal((await state()).npcCount, 4);
  assert.equal((await state()).pickableAnimals, 0);
  pass('Quiz fixture, independent animals and empty animal pick registry');
  await page.locator('[data-label="S01"]').click();
  await page.waitForFunction(
    () => window.__islandLab.snapshot().view === 'S01' && window.__islandLab.snapshot().zoom > 1.6,
  );
  await page.waitForTimeout(1000);
  for (const id of ['Q01', 'Q02', 'Q03', 'Q04'])
    assert.ok(await page.locator(`[data-label="${id}"]`).isVisible());
  pass('island label smoothly focuses S01 with readable Q labels');
  await page.locator('[data-label="Q01"]').click();
  assert.equal((await state()).dialog, true);
  assert.match(await page.locator('#dialog-title').textContent(), /Q01/);
  const modal = await state();
  await page.mouse.wheel(0, 600);
  await page.keyboard.press('+');
  await page.waitForTimeout(300);
  const during = await state();
  assert.ok(Math.abs(during.zoom - modal.zoom) < 0.01);
  assert.deepEqual(
    during.target.map((n) => n.toFixed(2)),
    modal.target.map((n) => n.toFixed(2)),
  );
  assert.notDeepEqual(during.shark, modal.shark);
  assert.deepEqual(
    during.npcs.find((n) => n.id === 'Q01').position,
    modal.npcs.find((n) => n.id === 'Q01').position,
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__islandLab.snapshot().dialog);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.label), 'Q01');
  pass('NPC Modal isolation, pause, autonomous animals and Escape focus restoration');
  await page.locator('[data-label="lecture"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Lecture/);
  assert.equal(await page.locator('#detail-dialog a,#detail-dialog iframe').count(), 0);
  await page.locator('#close-dialog').click();
  pass('Lecture placeholder has no external course link or embedded player');
  const canvas = await page.locator('canvas').boundingBox(),
    before = await state();
  await page.mouse.move(canvas.x + canvas.width * 0.78, canvas.y + canvas.height * 0.58);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(canvas.x + canvas.width * 0.78 + 80, canvas.y + canvas.height * 0.58 + 30, {
    steps: 8,
  });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(600);
  const dragged = await state();
  assert.notDeepEqual(dragged.target, before.target);
  assert.equal(dragged.dialog, false);
  pass('drag pans without opening content');
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(600);
  assert.ok((await state()).zoom > dragged.zoom);
  await page.locator('#overview').click();
  await page.waitForFunction(
    () =>
      window.__islandLab.snapshot().view === 'overview' &&
      Math.abs(window.__islandLab.snapshot().zoom - 1) < 0.01,
  );
  pass('wheel zoom and return to overview');
  await load('?demo=1&units=1&open=1&mode=video-only');
  assert.equal((await state()).npcCount, 0);
  assert.equal((await state()).animals.length, 3);
  assert.equal(await page.locator('[data-label^="Q"]').count(), 0);
  await focus('S01');
  await page.locator('[data-label="lecture"]').click();
  assert.equal((await state()).dialog, true);
  await page.keyboard.press('Escape');
  pass('video-only removes every NPC and retains Lecture and three animals');
  await load('?demo=1&units=1&open=1&mode=quiz');
  assert.equal((await state()).npcCount, 4);
  await focus('S01');
  await page.locator('[data-label="Q04"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Q04/);
  await page.keyboard.press('Escape');
  pass('returning to Quiz restores current geometry and click targets');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#overview').click();
  await page.waitForTimeout(800);
  await focus('S01');
  await page.locator('[data-label="Q02"]').click();
  const box = await page.locator('dialog').boundingBox();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  pass('narrow viewport navigation and bounded Modal');
  await page.setViewportSize({ width: 1366, height: 768 });
  await load('');
  assert.equal((await state()).demo, false);
  assert.equal((await state()).npcCount, 0);
  assert.equal((await state()).gates.length, 12);
  assert.equal(await page.locator('.label-locked').count(), 12);
  assert.equal(
    requests.filter((url) => /assignments\/S\d+\.json|course-videos\//.test(url)).length,
    0,
  );
  pass('default empty Manifest locks all curriculum and fetches no material');
  assert.deepEqual(errors, []);
  pass('no application JavaScript or Console errors');
  production = await preview({
    base: '/~wildwolf/engineering-island-lab/',
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  await page.goto(
    `http://127.0.0.1:${production.httpServer.address().port}/~wildwolf/engineering-island-lab/?demo=1&units=15&open=15&questions=5&mode=video-only`,
  );
  await page.waitForSelector('#loading[hidden]', { state: 'attached' });
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  assert.equal(await page.locator('.label-locked').count(), 12);
  assert.equal(await page.evaluate(() => typeof window.__islandLab), 'undefined');
  assert.ok(await page.locator('canvas').isVisible());
  assert.equal(await page.locator('select').count(), 1);
  pass('Apache production renders, ignores every Demo override and exposes only student controls');
  await checkModalReadability(page, base, pass);
  await checkArchipelago(page, base, pass);
  await checkBackgroundLife(page, base, pass);
  await checkPhase25(page, base, pass);
  assert.deepEqual(errors, []);
  console.log(`${checks} browser acceptance checks passed. Screenshots and metrics: test-results/`);
} finally {
  if (production) await new Promise((resolve) => production.httpServer.close(resolve));
  await browser.close();
  await server.close();
}
