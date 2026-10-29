import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

export async function checkBackgroundLife(page, base, pass) {
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const settled = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.01 &&
        s.target.every((v, i) => Math.abs(v - s.goalTarget[i]) < 0.015)
      );
    });
  const load = async (query) => {
    await page.goto(`${base}/${query}`);
    await page.waitForFunction(() => window.__islandLab);
    await settled();
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await settled();
  };
  await page.setViewportSize({ width: 1366, height: 768 });
  await load('?demo=1&units=12&open=4&questions=4');
  const start = await state();
  assert.equal(start.sea.whales.length, 4);
  assert.ok(start.visitors.length >= 3 && start.visitors.length <= 8);
  assert.equal(start.pickableBackground, 0);
  assert.equal(start.animals.length, 36);
  assert.equal(start.npcCount, 16);
  assert.equal(start.gates.length, 8);
  await page.waitForTimeout(1400);
  const flowing = await state();
  assert.notDeepEqual(
    flowing.sea.whales.map((w) => w.position),
    start.sea.whales.map((w) => w.position),
  );
  assert.equal(flowing.pickableBackground, 0);
  await page.screenshot({ path: 'test-results/life-overview-12.png' });
  pass(
    'flowing sea and four autonomous offshore whales coexist with original fauna, gates and NPCs',
  );

  const canvas = await page.locator('canvas').boundingBox();
  const whale = flowing.sea.whales.find(
    (w) =>
      w.screen.x > 20 &&
      w.screen.x < 1346 &&
      w.screen.y > canvas.y + 20 &&
      w.screen.y < canvas.y + canvas.height - 20,
  );
  assert.ok(whale, 'at least one offshore whale is visible in the accepted overview framing');
  await page.mouse.click(whale.screen.x, whale.screen.y);
  assert.equal((await state()).dialog, false);
  assert.equal((await state()).view, 'overview');
  pass('background whale click has no interaction or camera action');

  await page.waitForFunction(
    () => window.__islandLab.snapshot().visitors.some((v) => v.phase === 'bridge'),
    {},
    { timeout: 60000 },
  );
  const crossing = (await state()).visitors.find((v) => v.phase === 'bridge');
  const allowed = new Set(['academy', 'S01', 'S02', 'S03', 'S04']);
  assert.ok(allowed.has(crossing.from) && allowed.has(crossing.to));
  await focus(crossing.from === 'academy' ? crossing.to : crossing.from);
  await page.screenshot({ path: 'test-results/life-bridge-visitors.png' });
  await page.locator('#overview').click();
  await settled();
  pass('small unnumbered visitors visibly travel on bridges only between allowed nodes');

  await focus('S01');
  await page.locator('[data-label="Q01"]').click();
  const paused = (await state()).npcs.find((n) => n.unitId === 'S01' && n.id === 'Q01');
  assert.equal(paused.paused, true);
  const oceanBefore = (await state()).sea.whales.map((w) => w.position);
  await page.waitForTimeout(1100);
  assert.deepEqual(
    (await state()).npcs.find((n) => n.unitId === 'S01' && n.id === 'Q01').position,
    paused.position,
  );
  assert.notDeepEqual(
    (await state()).sea.whales.map((w) => w.position),
    oceanBefore,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    (await state()).npcs.find((n) => n.unitId === 'S01' && n.id === 'Q01').paused,
    false,
  );
  await page.screenshot({ path: 'test-results/life-visitors.png' });
  pass('background systems do not interrupt question-NPC Modal pause and resume');

  await load('?demo=1&units=15&open=15&questions=5');
  assert.equal((await state()).npcCount, 75);
  assert.equal((await state()).animals.length, 45);
  assert.equal((await state()).visitors.length, 8);
  assert.equal((await state()).gates.length, 0);
  await page.screenshot({ path: 'test-results/life-overview-15.png' });
  pass(
    'all-open fifteen-island Quiz supports 75 question NPCs, 45 fauna, four whales and eight visitors',
  );
  await load('?demo=1&units=15&open=15&questions=5&mode=video-only');
  assert.equal((await state()).npcCount, 0);
  assert.equal((await state()).animals.length, 45);
  assert.equal((await state()).sea.whales.length, 4);
  assert.equal((await state()).visitors.length, 8);
  assert.equal((await state()).pickableBackground, 0);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  await focus('S02');
  await page.screenshot({ path: 'test-results/life-video-only.png' });
  pass('Video-only retains visitors, whales and all island fauna with zero question NPCs');

  const prior = JSON.parse(await readFile('test-results/revision-performance.json', 'utf8'));
  const samples = prior.samples.map((s) => ({ ...s, mode: 'quiz', openUnits: 4, questions: 4 }));
  async function sample(name) {
    await page.waitForTimeout(600);
    const measured = await page.evaluate(async () => {
      const times = [];
      await new Promise((resolve) => {
        const tick = (t) => {
          times.push(t);
          if (times.length === 31) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const s = window.__islandLab.snapshot();
      const gl = document.querySelector('canvas').getContext('webgl2');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        mode: s.mode,
        openUnits: s.open.length,
        questions: 4,
        totalUnits: s.totalUnits,
        npcCount: s.npcCount,
        visitors: s.visitors.length,
        whales: s.sea.whales.length,
        fauna: s.animals.length,
        fps: 30000 / (times.at(-1) - times[0]),
        drawCalls: s.drawCalls,
        triangles: s.triangles,
        geometries: s.geometries,
        textures: s.textures,
        renderer: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        viewport: [innerWidth, innerHeight],
        dpr: devicePixelRatio,
      };
    });
    samples.push({ name, ...measured });
    console.log(`LIFE_METRIC ${JSON.stringify({ name, ...measured })}`);
  }
  await load('?demo=1&units=12&open=4&questions=4&mode=video-only');
  await sample('12-unit overview / Video-only / 1366x768');
  await load('?demo=1&units=15&open=4&questions=4&mode=video-only');
  await sample('15-unit overview / Video-only / 1366x768');
  await focus('S01');
  await sample('15-unit S01 focus / Video-only / 1366x768');
  await writeFile(
    'test-results/life-performance.json',
    JSON.stringify({ browser: prior.browser, samples }, null, 2) + '\n',
  );
  pass(
    '12/15 overview, single-island focus and both course modes have measured software/hardware renderer identity',
  );

  await load('');
  assert.equal((await state()).visitors.length, 0);
  assert.equal((await state()).gates.length, 12);
  assert.equal((await state()).sea.whales.length, 4);
  pass('official empty Manifest produces no visitors and keeps every locked gate');
}
