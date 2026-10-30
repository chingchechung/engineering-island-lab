import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { ORBIT_SPEED } from '../src/camera.js';

const closeDirection = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.003;
export async function checkPhase25(page, base, pass) {
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const close = async () => {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return !s.dialog && s.npcs.every((n) => !n.paused);
    });
  };
  const settle = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.azimuth - s.azimuthGoal) < 0.001 &&
        Math.abs(s.elevation - s.elevationGoal) < 0.001 &&
        Math.abs(s.zoom - s.goalZoom) < 0.002 &&
        s.target.every((n, i) => Math.abs(n - s.goalTarget[i]) < 0.003)
      );
    });
  const load = async (units = 12, mode = 'quiz', open = units) => {
    await page.goto(`${base}/?demo=1&units=${units}&open=${open}&questions=5&mode=${mode}`);
    await page.waitForFunction(() => window.__islandLab);
    await settle();
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await settle();
  };
  const shot = (name) => page.screenshot({ path: `test-results/phase25-${name}.png` });
  const toggle = async (night) => {
    await page.locator('#day-night').click();
    await page.waitForFunction(
      (expected) => window.__islandLab.snapshot().lighting.blend === expected,
      night ? 1 : 0,
    );
  };
  const drag = async (dx, dy = 0, { button = 'left', shift = false } = {}) => {
    const rect = await page.locator('canvas').boundingBox();
    const x = rect.x + rect.width * 0.88,
      y = rect.y + rect.height * 0.91;
    await page.mouse.move(x, y);
    if (shift) await page.keyboard.down('Shift');
    await page.mouse.down({ button });
    await page.mouse.move(x + dx, y + dy, {
      steps: Math.max(1, Math.min(6, Math.floor(Math.hypot(dx, dy) / 10))),
    });
    await page.mouse.up({ button });
    if (shift) await page.keyboard.up('Shift');
    await settle();
    assert.equal((await state()).dialog, false, 'drag never opens a content dialog');
  };
  const quarter = -Math.PI / 2 / ORBIT_SPEED;
  const audit = [];
  await page.setViewportSize({ width: 1366, height: 768 });
  await load();
  const day = await state(),
    standard = { a: day.azimuth, e: day.elevation };
  assert.equal(day.lighting.blend, 0);
  await shot('overview-12-day');
  await page.locator('#day-night').click();
  await page.waitForFunction(() => {
    const b = window.__islandLab.snapshot().lighting.blend;
    return b > 0 && b < 1;
  });
  const transition = await state();
  assert.ok(transition.time > day.time);
  assert.notDeepEqual(transition.sea.whales[0].position, day.sea.whales[0].position);
  await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
  const night = await state();
  assert.deepEqual(night.open, day.open);
  assert.deepEqual(night.target, day.target);
  assert.equal(night.azimuth, day.azimuth);
  assert.equal(night.zoom, day.zoom);
  await shot('overview-12-night');
  audit.push({ case: '12-day-night-identical-camera', day, night });
  pass(
    'Day/Night transitions continuously with identical camera and unchanged publication/background motion',
  );
  assert.equal(await page.locator('#day-night').getAttribute('aria-pressed'), 'true');
  await page.locator('#day-night').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 0);
  assert.equal(await page.locator('#day-night').getAttribute('aria-pressed'), 'false');
  await toggle(true);
  pass('compact Day/Night toggle supports accessible names, keyboard and complete Day restoration');

  await focus('academy');
  await shot('academy-night');
  await focus('S01');
  await shot('lecture-bridge-night');
  await focus('S05');
  await shot('volcano-night');
  await focus('overview');
  for (let turn = 1; turn <= 4; turn++) {
    await drag(quarter);
    const s = await state();
    assert.ok(closeDirection(s.azimuth, standard.a + (turn * Math.PI) / 2));
    assert.ok(
      s.framingExtent < 0.99,
      `12 islands fit after ${turn * 90} degrees: ${s.framingExtent}`,
    );
    if (turn === 1) await shot('overview-12-orbit-90');
    if (turn === 2) await shot('overview-12-orbit-180');
    audit.push({
      case: `12-orbit-${turn * 90}`,
      azimuth: s.azimuth,
      elevation: s.elevation,
      extent: s.framingExtent,
    });
  }
  pass('left drag rotates 90/180/270/360 degrees, all 12 island framing points remain visible');
  await drag(quarter * 4);
  assert.ok((await state()).azimuth > standard.a + Math.PI * 3.9);
  await page.locator('#overview').click();
  await settle();
  assert.ok(closeDirection((await state()).azimuth, standard.a));
  await drag(0, 200);
  assert.ok(Math.abs((await state()).elevation - (70 * Math.PI) / 180) < 0.002);
  await drag(0, -200);
  assert.ok(Math.abs((await state()).elevation - (25 * Math.PI) / 180) < 0.002);
  await page.locator('#overview').click();
  await settle();
  pass(
    'continuous multiple revolutions, 25–70 degree elevation limits and standard-angle overview reset',
  );
  await focus('S01');
  await drag(quarter * 2);
  const reversed = await state();
  await shot('S01-orbit-180-night');
  await focus('S02');
  assert.ok(closeDirection((await state()).azimuth, reversed.azimuth));
  await focus('S01');
  const reverseBoxes = await page
    .locator('[data-label="S01"],[data-label="lecture"],.label-question.in-detail')
    .evaluateAll((elements) =>
      elements
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
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
  assert.equal(reverseBoxes.length, 7);
  for (let i = 0; i < reverseBoxes.length; i++)
    for (let j = i + 1; j < reverseBoxes.length; j++) {
      const a = reverseBoxes[i],
        b = reverseBoxes[j];
      assert.ok(
        !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top),
        `${a.id}/${b.id} reverse-view labels remain distinct`,
      );
    }
  const modelCandidate = await page.evaluate(() => {
    const lab = window.__islandLab;
    const canvas = document.querySelector('canvas');
    return lab.snapshot().npcs.find((n) => {
      const pick = lab.inspectPick(n.bodyScreen.x, n.bodyScreen.y);
      return (
        n.unitId === 'S01' &&
        pick?.id === n.id &&
        pick?.unitId === n.unitId &&
        document.elementFromPoint(n.bodyScreen.x, n.bodyScreen.y) === canvas
      );
    });
  });
  assert.ok(
    modelCandidate,
    'at least one unobstructed NPC model is ray-pickable from the reverse view',
  );
  await page.mouse.click(modelCandidate.bodyScreen.x, modelCandidate.bodyScreen.y);
  assert.match(
    await page.locator('#dialog-title').textContent(),
    new RegExp(`^S01 · ${modelCandidate.id} ·`),
  );
  await close();
  const lectureModel = (await state()).lectureScreens.find((l) => l.id === 'S01').screen;
  assert.deepEqual(
    await page.evaluate((p) => window.__islandLab.inspectPick(p.x, p.y), lectureModel),
    { type: 'lecture', id: 'S01', unitId: 'S01' },
  );
  await page.mouse.click(lectureModel.x, lectureModel.y);
  await page.waitForFunction(() => window.__islandLab.snapshot().dialog);
  assert.match(await page.locator('#dialog-title').textContent(), /S01.*Lecture/);
  await close();
  for (const id of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05']) {
    const label = page.locator(`[data-label="${id}"]`);
    await label.click();
    assert.match(await page.locator('#dialog-title').textContent(), new RegExp(`^S01 · ${id} ·`));
    const s = await state();
    assert.equal(s.npcs.find((n) => n.unitId === 'S01' && n.id === id).paused, true);
    assert.equal(s.npcs.filter((n) => n.paused).length, 1);
    if (id === 'Q05') await shot('npc-night-180');
    await close();
    assert.equal((await state()).npcs.find((n) => n.unitId === 'S01' && n.id === id).paused, false);
  }
  await page.locator('[data-label="lecture"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /S01.*Lecture/);
  const frozen = await state();
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(900, 650, { steps: 8 });
  await page.mouse.up();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(980, 610);
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -500);
  await page.keyboard.press('Home');
  await page.waitForTimeout(600);
  const during = await state();
  for (const key of [
    'target',
    'goalTarget',
    'zoom',
    'goalZoom',
    'azimuth',
    'azimuthGoal',
    'elevation',
    'elevationGoal',
  ])
    assert.deepEqual(during[key], frozen[key], key);
  assert.notDeepEqual(during.sea.whales[0].position, frozen.sea.whales[0].position);
  assert.notDeepEqual(
    during.animals.map((a) => a.position),
    frozen.animals.map((a) => a.position),
  );
  await page.locator('#close-dialog').click();
  pass(
    '180-degree view preserves exact Q01–Q05 identity, pause/resume and Lecture; Modal freezes all camera inputs while life continues',
  );

  const initial = await state();
  await drag(65, 25, { button: 'right' });
  assert.notDeepEqual((await state()).target, initial.target);
  assert.equal((await state()).azimuthGoal, initial.azimuthGoal);
  const pan = await state();
  await drag(-65, 15, { shift: true });
  assert.notDeepEqual((await state()).target, pan.target);
  assert.equal((await state()).azimuthGoal, pan.azimuthGoal);
  const rect = await page.locator('canvas').boundingBox();
  await page.mouse.move(rect.x + rect.width * 0.9, rect.y + rect.height * 0.85);
  const zoom = (await state()).goalZoom;
  await page.mouse.wheel(0, -150);
  await settle();
  assert.ok((await state()).goalZoom > zoom);
  pass('right drag and Shift+left drag pan without rotation, wheel remains continuous');

  await focus('S01');
  const label = await page.locator('[data-label="Q01"]').boundingBox();
  const beforeLabel = await state();
  await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2);
  await page.mouse.down();
  await page.mouse.move(label.x + label.width / 2 + 90, label.y + label.height / 2, { steps: 9 });
  await page.mouse.move(label.x + label.width / 2, label.y + label.height / 2, { steps: 9 });
  await page.mouse.up();
  assert.equal((await state()).dialog, false);
  assert.equal((await state()).azimuthGoal, beforeLabel.azimuthGoal);
  await page.locator('[data-label="Q01"]').focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#dialog-title').textContent(), /^S01 · Q01/);
  await page.keyboard.press('Escape');
  pass(
    'drag from a CSS2D label and back neither opens content nor leaks into camera; keyboard activation still works',
  );

  await load(15);
  await toggle(true);
  const all = await state();
  assert.equal(all.animals.length, 45);
  assert.equal(all.npcCount, 75);
  assert.equal(all.sea.whales.length, 4);
  assert.equal(Object.keys(all.lighting.cottages).length, 15);
  assert.ok(Object.values(all.lighting.cottages).every((c) => c.windows >= 1 && c.lamps >= 1));
  assert.equal(all.lighting.bridges.filter((b) => b.main && b.lamps > 0).length, 6);
  assert.equal(all.lighting.themes.length, 15);
  assert.equal(all.lighting.actualLocalLights, 0);
  assert.equal(all.lighting.localShadowLights, 0);
  audit.push({ case: '15-lighting', lighting: all.lighting });
  for (let i = 0; i < 4; i++) {
    await drag(quarter);
    assert.ok((await state()).framingExtent < 0.99);
  }
  await shot('overview-15-night');
  await focus('S14');
  await shot('crystal-night');
  const warm = await state();
  for (let repeat = 0; repeat < 2; repeat++) {
    await toggle(false);
    await toggle(true);
  }
  assert.equal((await state()).geometries, warm.geometries);
  assert.equal((await state()).textures, warm.textures);
  pass('15-island Night world retains 45 fauna, four whales, 75 NPCs and fits every quadrant');
  await load(15, 'video-only', 4);
  await toggle(true);
  assert.equal((await state()).npcCount, 0);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  assert.equal((await state()).gates.length, 11);
  assert.equal((await state()).pickableBackground, 0);
  await focus('S02');
  await shot('video-only-night');
  await page.locator('[data-label="S02-lecture"]').click();
  assert.equal((await state()).dialog, true);
  await page.keyboard.press('Escape');
  pass(
    'Video-only Night retains lighting and background life, no question NPCs, locked gates unchanged',
  );
  await load(1);
  assert.equal((await state()).lighting.blend, 0);
  await drag(quarter);
  await page.locator('#overview').click();
  await settle();
  assert.ok(closeDirection((await state()).azimuth, standard.a));
  assert.ok((await state()).framingExtent < 0.99);
  pass('reload defaults to Day, single-unit focus/orbit/reset also fits');
  await page.setViewportSize({ width: 390, height: 844 });
  await load(12);
  await toggle(true);
  await shot('narrow-night');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await focus('S01');
  await page.locator('[data-label="lecture"]').click();
  assert.ok(await page.locator('#close-dialog').isVisible());
  await page.keyboard.press('Escape');
  pass('390px layout retains accessible lighting control, navigation and large readable Modal');
  await page.setViewportSize({ width: 1366, height: 768 });
  await load(1);
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const touchBefore = await state();
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 1120, y: 600, id: 1 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 1050, y: 625, id: 1 }],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle();
  assert.notDeepEqual((await state()).target, touchBefore.target);
  assert.equal((await state()).azimuthGoal, touchBefore.azimuthGoal);
  await focus('S01');
  const npc = (await state()).npcs.find((n) => n.id === 'Q03');
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: npc.screen.x, y: npc.screen.y, id: 1 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: npc.screen.x, y: npc.screen.y, id: 1 },
      { x: npc.screen.x + 35, y: npc.screen.y + 20, id: 2 },
    ],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal((await state()).dialog, false);
  const qLabel = await page.locator('[data-label="Q03"]').boundingBox();
  const second = { x: qLabel.x + qLabel.width / 2, y: qLabel.y + qLabel.height / 2, id: 2 };
  const model = (await state()).npcs.find((n) => n.id === 'Q01').bodyScreen;
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: model.x, y: model.y, id: 1 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: model.x, y: model.y, id: 1 }, second],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(
    (await state()).dialog,
    false,
    'a second finger on a CSS label cancels the canvas gesture',
  );
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...second, id: 1 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { ...second, id: 1 },
      { x: 1120, y: 600, id: 2 },
    ],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(
    (await state()).dialog,
    false,
    'a second finger on the canvas cancels the label gesture',
  );
  await page.locator('[data-label="Q03"]').click();
  assert.match(await page.locator('#dialog-title').textContent(), /^S01 · Q03/);
  await close();
  await touch.detach();
  pass('real browser single-finger pan is retained and multi-touch over an NPC cannot activate it');
  await writeFile('test-results/phase25-audit.json', JSON.stringify(audit, null, 2) + '\n');
  await page.setViewportSize({ width: 1366, height: 768 });
}
