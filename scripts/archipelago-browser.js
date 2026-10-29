import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkArchipelago(page, base, pass) {
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const settle = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.01 &&
        s.target.every((n, i) => Math.abs(n - s.goalTarget[i]) < 0.015)
      );
    });
  const load = async ({ units = 12, open = 4, questions = 4, mode = 'quiz' } = {}) => {
    await page.goto(
      `${base}/?demo=1&units=${units}&open=${open}&questions=${questions}&mode=${mode}`,
    );
    await page.waitForFunction(() => window.__islandLab);
    await settle();
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await settle();
    assert.equal((await state()).view, id);
  };
  await page.setViewportSize({ width: 1366, height: 768 });
  await load();
  async function overview(count, file) {
    await page.locator('#overview').click();
    await settle();
    await page.waitForTimeout(800);
    const s = await state();
    assert.equal(s.landmarks.length, count);
    for (const p of s.landmarks)
      assert.ok(
        Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1,
        `${p.id} stays in view`,
      );
    const canvas = await page.locator('canvas').boundingBox();
    const boxes = await page
      .locator('.label-unit,.label-locked,.label-academy')
      .evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            id: el.dataset.label,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          };
        }),
      );
    for (const b of boxes)
      assert.ok(
        b.left >= 0 &&
          b.right <= canvas.width &&
          b.top >= canvas.y &&
          b.bottom <= canvas.y + canvas.height,
        `${b.id} title is in the map`,
      );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        assert.ok(
          !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top),
          `${a.id}/${b.id} labels overlap`,
        );
      }
    await page.screenshot({ path: `test-results/revision-${file}.png` });
  }
  assert.equal((await state()).npcCount, 16);
  assert.deepEqual((await state()).open, ['S01', 'S02', 'S03', 'S04']);
  assert.equal(await page.locator('[data-label="S13"]').count(), 0);
  await overview(12, 'overview-12');
  pass('12-unit overview, label collisions, exact unit range and isolated Demo opening');
  const ui = await page.evaluate(() => ({
    headers: document.querySelectorAll('h1').length,
    title: document.querySelector('h1').textContent,
    canvasHeight: document.querySelector('canvas').getBoundingClientRect().height,
    selects: document.querySelectorAll('select').length,
    code: parseFloat(getComputedStyle(document.querySelector('.label-unit strong')).fontSize),
    name: parseFloat(getComputedStyle(document.querySelector('.island-name')).fontSize),
    removed: document.querySelectorAll(
      '.explore-card,.world-heading,#demo-controls,#mode-quiz,#demo-open',
    ).length,
  }));
  assert.equal(ui.headers, 1);
  assert.equal(ui.title, '數位電子學');
  assert.ok(ui.canvasHeight >= 630);
  assert.equal(ui.selects, 1);
  assert.equal(ui.removed, 0);
  assert.ok(ui.code >= 16 && ui.name >= 13);
  pass(
    'single compact course header, one lower-left navigation, readable fonts and larger 3D viewport',
  );
  await focus('S05');
  assert.match(await page.locator('#view-status').textContent(), /S05 尚未開放/);
  await page.locator('[data-label="S05-lecture"]').click();
  assert.equal((await state()).dialog, false);
  assert.ok(await page.locator('[data-label="S05-gate"]').isVisible());
  await page.screenshot({ path: 'test-results/revision-locked-gate.png' });
  pass('complete bridge, cute gate and locked-content blocking');
  const before = (await state()).animals.map((a) => a.position);
  await page.waitForTimeout(700);
  const after = await state();
  assert.notDeepEqual(
    after.animals.map((a) => a.position),
    before,
  );
  assert.equal(after.pickableAnimals, 0);
  assert.equal(after.animals.length, 36);
  for (const id of after.landmarks.map((i) => i.id))
    assert.equal(after.animals.filter((a) => a.unitId === id).length, 3);
  pass('three independent autonomous animals per island, no animal interactions');
  await load({ open: 15, questions: 5 });
  assert.equal((await state()).gates.length, 0);
  assert.equal((await state()).npcCount, 60);
  await focus('S05');
  await page.locator('[data-label="S05-Q05"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /Q05/);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/revision-volcano.png' });
  for (const [id, file] of [
    ['S07', 'snow'],
    ['S06', 'candy'],
  ]) {
    await focus(id);
    await page.screenshot({ path: `test-results/revision-${file}.png` });
    await page.locator(`[data-label="${id}-lecture"]`).click();
    assert.equal((await state()).dialog, true);
    await page.keyboard.press('Escape');
  }
  pass('opening clears gates; five NPCs and themed Lecture targets remain usable');
  await load({ units: 15, open: 15 });
  await overview(15, 'overview-15');
  assert.equal((await state()).npcCount, 60);
  assert.equal((await state()).animals.length, 45);
  assert.equal(new Set((await state()).animals.map((a) => a.kind)).size, 15);
  for (const id of ['S13', 'S14', 'S15']) {
    await focus(id);
    await page.screenshot({ path: `test-results/revision-${id}.png` });
  }
  pass('15-unit radial world and extended islands, 45 animals and 15 distinct species');
  const dressing = (await state()).dressing;
  await load({ units: 15, open: 15, mode: 'video-only' });
  assert.equal((await state()).npcCount, 0);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  assert.equal((await state()).animals.length, 45);
  assert.deepEqual((await state()).dressing, dressing);
  await focus('S15');
  await page.screenshot({ path: 'test-results/revision-video-only.png' });
  pass('video-only retains all 45 fauna and identical rich static dressing, with no NPCs');

  await load();
  await focus('S01');
  await page.waitForFunction(
    () => window.__islandLab.snapshot().npcs.some((n) => n.unitId === 'S01' && n.phase === 'walk'),
    {},
    { timeout: 20000 },
  );
  let moving = (await state()).npcs.find((n) => n.unitId === 'S01' && n.phase === 'walk');
  const key = { unitId: moving.unitId, id: moving.id };
  await page.screenshot({ path: 'test-results/revision-npc-walking.png' });
  await page.mouse.click(moving.screen.x, moving.screen.y);
  await page.waitForFunction((k) => {
    const s = window.__islandLab.snapshot();
    return s.dialog && s.npcs.find((n) => n.unitId === k.unitId && n.id === k.id)?.paused;
  }, key);
  const paused = (await state()).npcs.find(
    (n) => n.unitId === key.unitId && n.id === key.id,
  ).position;
  await page.waitForTimeout(900);
  assert.deepEqual(
    (await state()).npcs.find((n) => n.unitId === key.unitId && n.id === key.id).position,
    paused,
  );
  await page.screenshot({ path: 'test-results/revision-npc-paused.png' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    (k) =>
      !window.__islandLab.snapshot().npcs.find((n) => n.unitId === k.unitId && n.id === k.id)
        .paused,
    key,
  );
  await page.waitForFunction(
    ({ key, paused }) =>
      window.__islandLab
        .snapshot()
        .npcs.find((n) => n.unitId === key.unitId && n.id === key.id)
        .position.some((n, i) => Math.abs(n - paused[i]) > 0.02),
    { key, paused },
    { timeout: 20000 },
  );
  pass(
    'moving NPC model raycast stops immediately, Modal freezes it, closing resumes bounded roaming',
  );
  const moved = (await state()).npcs.find((n) => n.unitId === key.unitId && n.id === key.id),
    head = await page.locator(`[data-label="${key.id}"]`).boundingBox();
  assert.ok(
    Math.abs(head.x + head.width / 2 - moved.headScreen.x) < 3 &&
      Math.abs(head.y + head.height / 2 - moved.headScreen.y) < 3,
  );
  await page.mouse.click(head.x + head.width / 2, head.y + head.height / 2);
  await page.waitForFunction(() => window.__islandLab.snapshot().dialog);
  assert.equal(
    (await state()).npcs.find((n) => n.unitId === key.unitId && n.id === key.id).paused,
    true,
  );
  await page.keyboard.press('Escape');
  pass('head label follows the roaming root and clicking it uses the same pause mechanism');

  const performance = [];
  async function sample(name) {
    await page.waitForTimeout(600);
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
      const s = window.__islandLab.snapshot(),
        gl = document.querySelector('canvas').getContext('webgl2'),
        debug = gl.getExtension('WEBGL_debug_renderer_info');
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
  await load({ units: 15 });
  await sample('15-unit overview / 1366x768');
  await focus('S01');
  await sample('15-unit S01 focus / 1366x768');
  await load();
  await sample('12-unit overview / 1366x768');
  await focus('S01');
  await sample('12-unit S01 focus / 1366x768');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator('#overview').click();
  await settle();
  await page.screenshot({ path: 'test-results/revision-wide.png' });
  await sample('12-unit overview / 1920x1080');
  await writeFile(
    'test-results/revision-performance.json',
    JSON.stringify({ browser: page.context().browser().version(), samples: performance }, null, 2) +
      '\n',
  );
  pass('12/15 overview and focused FPS, draw calls, triangles and GPU identity measured');
  await page.setViewportSize({ width: 390, height: 844 });
  await load({ units: 15 });
  await overview(15, 'narrow');
  const fonts = await page
    .locator('.label-locked')
    .first()
    .evaluate((el) => ({
      code: parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),
      name: parseFloat(getComputedStyle(el.querySelector('.island-name')).fontSize),
    }));
  assert.ok(fonts.code >= 14 && fonts.name >= 12);
  await focus('S02');
  await page.locator('[data-label="S02-lecture"]').click();
  assert.equal((await state()).dialog, true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  pass('narrow 15-unit labels stay readable and navigation/Modal remain usable');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.route('**/course-config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        courseTitle: '電路設計工作坊',
        totalUnits: 1,
        assignmentMode: 'video-only',
      }),
    }),
  );
  await page.goto(base);
  await page.waitForFunction(() => window.__islandLab);
  assert.equal(await page.locator('h1').textContent(), '電路設計工作坊');
  assert.match(await page.title(), /Engineering Island Lab · 電路設計工作坊/);
  assert.equal(await page.locator('h1').count(), 1);
  await page.unroute('**/course-config.json');
  pass('course title is read from JSON, with no second large page heading');
}
