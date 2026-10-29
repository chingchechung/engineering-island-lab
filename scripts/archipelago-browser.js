import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkArchipelago(page, base, pass) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${base}/?demo=1`);
  await page.waitForFunction(() => window.__islandLab?.snapshot().totalUnits === 12);
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const waitView = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await page.waitForFunction((expected) => window.__islandLab.snapshot().view === expected, id);
    await page.waitForTimeout(1400);
  };
  async function checkOverview(count) {
    await page.locator('#overview').click();
    await page.waitForFunction(() => Math.abs(window.__islandLab.snapshot().zoom - 1) < 0.01);
    await page.waitForTimeout(600);
    const s = await state();
    assert.equal(s.landmarks.length, count);
    for (const p of s.landmarks)
      assert.ok(
        Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1,
        `${p.id} lies within the overview`,
      );
    const boxes = await page
      .locator('.label-unit,.label-locked,.label-academy')
      .evaluateAll((elements) =>
        elements.map((el) => ({
          id: el.dataset.label,
          left: el.getBoundingClientRect().left,
          right: el.getBoundingClientRect().right,
          top: el.getBoundingClientRect().top,
          bottom: el.getBoundingClientRect().bottom,
        })),
      );
    for (const box of boxes) {
      assert.ok(
        box.left >= 0 && box.right <= 1366 && box.top >= 150 && box.bottom <= 603,
        `${box.id} label is fully in the map`,
      );
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        assert.ok(
          !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top),
          `${a.id}/${b.id} label overlap`,
        );
      }
    await page.screenshot({ path: `test-results/phase-2-overview-${count}.png` });
  }
  assert.equal((await state()).npcCount, 16);
  assert.deepEqual((await state()).open, ['S01', 'S02', 'S03', 'S04']);
  assert.equal(await page.locator('[data-label="S13"]').count(), 0);
  await checkOverview(12);
  pass('12-unit overview, readable labels, S13–S15 absent, isolated S01–S04 Demo');
  await waitView('S05');
  assert.match(await page.locator('#view-status').textContent(), /S05 尚未開放/);
  await page.locator('[data-label="S05-lecture"]').click();
  assert.equal((await state()).dialog, false);
  assert.ok(await page.locator('[data-label="S05-gate"]').isVisible());
  await page.screenshot({ path: 'test-results/phase-2-locked-gate.png' });
  pass('locked volcano keeps scenery/gate and blocks Lecture');
  const animalBefore = (await state()).animals.map((a) => a.position);
  await page.waitForTimeout(500);
  assert.notDeepEqual(
    (await state()).animals.map((a) => a.position),
    animalBefore,
  );
  assert.equal((await state()).pickableAnimals, 0);
  pass('all themes animate autonomously, no animal picking');
  await page.selectOption('#demo-open', '15');
  assert.equal((await state()).gates.length, 0);
  await page.selectOption('#demo-questions', '5');
  assert.equal((await state()).npcCount, 60);
  await waitView('S05');
  await page.locator('[data-label="S05-Q05"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Q05/);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/phase-2-volcano.png' });
  await page.selectOption('#demo-questions', '4');
  for (const [id, file] of [
    ['S07', 'snow'],
    ['S06', 'candy'],
  ]) {
    await waitView(id);
    await page.screenshot({ path: `test-results/phase-2-${file}.png` });
    await page.locator(`[data-label="${id}-lecture"]`).click();
    assert.equal((await state()).dialog, true);
    await page.keyboard.press('Escape');
  }
  pass('all-open gates disappear; Q05, volcano, snow and candy themed Lecture targets work');
  await page.selectOption('#demo-units', '15');
  await checkOverview(15);
  assert.equal((await state()).npcCount, 60);
  assert.ok(await page.locator('[data-label="S15"]').isVisible());
  for (const id of ['S13', 'S14', 'S15']) {
    await waitView(id);
    await page.screenshot({ path: `test-results/phase-2-${id}.png` });
  }
  pass('15-unit world, complete extended themes, all-unit NPC counts and navigation');
  await page.locator('#mode-video').click();
  assert.equal((await state()).npcCount, 0);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  await page.screenshot({ path: 'test-results/phase-2-video-only.png' });
  pass('15-unit video-only has no NPCs, labels, or NPC targets');

  const performance = [];
  async function sample(name) {
    // Measure actual presentation callbacks, including software-rendering cost.
    await page.waitForTimeout(700);
    const measured = await page.evaluate(async () => {
      const times = [];
      await new Promise((resolve) => {
        const tick = (t) => {
          times.push(t);
          if (times.length >= 31) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const s = window.__islandLab.snapshot();
      const gl = document.querySelector('canvas').getContext('webgl2');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        fps: (30 * 1000) / (times.at(-1) - times[0]),
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
    performance.push({ name, ...measured });
    console.log(`METRIC ${JSON.stringify({ name, ...measured })}`);
  }
  await page.locator('#mode-quiz').click();
  await page.selectOption('#demo-open', '4');
  await page.locator('#overview').click();
  await page.waitForTimeout(1400);
  await sample('15-unit overview / 1366x768');
  await waitView('S01');
  await sample('15-unit S01 focus / 1366x768');
  await page.selectOption('#demo-units', '12');
  await page.waitForTimeout(1400);
  await sample('12-unit overview / 1366x768');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/phase-2-wide.png' });
  await sample('12-unit overview / 1920x1080');
  await writeFile(
    'test-results/phase-2-performance.json',
    JSON.stringify({ browser: page.context().browser().version(), samples: performance }, null, 2) +
      '\n',
  );
  pass('actual FPS, draw calls, triangles and software-GPU limits recorded');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#overview').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/phase-2-narrow.png' });
  await page.selectOption('#unit-navigation', 'S02');
  await page.waitForTimeout(1600);
  await page.locator('[data-label="S02-lecture"]').click();
  assert.equal((await state()).dialog, true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  pass('narrow 12-unit navigation, Lecture and modal remain operable');
  await page.setViewportSize({ width: 1366, height: 768 });
}
