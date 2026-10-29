import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { createRadialLayout } from '../src/world/layout.js';
import { createIslandScene } from '../src/scene.js';
import { CameraRig } from '../src/camera.js';
import { resolvePreviewOptions } from '../src/config.js';
import { arrangeLabels } from '../src/label-layout.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';
const config = { courseTitle: '其他工程課程', totalUnits: 12, assignmentMode: 'quiz' };
const fixture = {
  ...demoFixture,
  questions: [
    ...demoFixture.questions,
    { id: 'Q05', name: '小嶼', color: '#739bb8', position: [3.6, 0.1] },
  ],
};
const make = (n = 15, mode = 'quiz') =>
  createIslandScene({ ...config, totalUnits: n, assignmentMode: mode }, fixture, {
    manifest: createDemoManifest(n, n),
  });

test('all 1–15 radial prefixes connect through at most two unit hops and six trunks', () => {
  for (let n = 1; n <= 15; n++) {
    const layout = createRadialLayout(n);
    assert.equal(layout.size, n);
    const trunks = [...layout].filter(([, r]) => r.parent === 'academy');
    assert.equal(trunks.length, Math.min(6, n));
    for (const [, entry] of layout) {
      if (entry.parent !== 'academy') assert.equal(layout.get(entry.parent).parent, 'academy');
    }
    if (n >= 6) {
      const quadrants = new Set(
        trunks.map(([, r]) => `${Math.sign(r.position[0])}/${Math.sign(r.position[1])}`),
      );
      assert.ok(quadrants.size >= 4);
    }
    const edges = [...layout].map(([id, r]) => ({
      id,
      a: r.parent === 'academy' ? [0, 0] : layout.get(r.parent).position,
      b: r.position,
      parent: r.parent,
    }));
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let i = 0; i < edges.length; i++)
      for (let j = i + 1; j < edges.length; j++) {
        const a = edges[i],
          b = edges[j];
        if (a.parent === b.parent || a.parent === b.id || b.parent === a.id) continue;
        assert.equal(
          cross(a.a, a.b, b.a) * cross(a.a, a.b, b.b) < 0 &&
            cross(b.a, b.b, a.a) * cross(b.a, b.b, a.b) < 0,
          false,
        );
      }
  }
});
for (const n of [1, 12, 15])
  test(`actual ${n}-island framing stays visible at desktop and phone aspects`, () => {
    const world = make(n);
    for (const aspect of [1366 / 638, 1920 / 950, 390 / 714]) {
      const rig = new CameraRig(world.bounds, aspect, world.framingPoints);
      for (const point of world.framingPoints) {
        const p = point.clone().project(rig.camera);
        assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
      }
      for (const [id] of world.records) {
        rig.focus(id, world.focusBounds(id));
        rig.update(3);
        assert.ok(rig.camera.zoom > 1.3);
      }
    }
    world.dispose();
  });
test('readable labels pack without clipping or overlaps at desktop and narrow sizes', () => {
  for (const [width, height, labelWidth, labelHeight] of [
    [1366, 638, 130, 58],
    [390, 714, 100, 50],
  ]) {
    const viewport = { left: 0, top: 0, right: width, bottom: height };
    const labels = Array.from({ length: 16 }, (_, i) => ({
      id: String(i),
      rect: {
        left: width / 2 - labelWidth / 2,
        top: height / 2 - labelHeight / 2,
        right: width / 2 + labelWidth / 2,
        bottom: height / 2 + labelHeight / 2,
      },
    }));
    const placed = arrangeLabels(labels, viewport);
    assert.equal(placed.length, 16);
    for (const item of placed) {
      assert.ok(
        item.rect.left >= 0 &&
          item.rect.right <= width &&
          item.rect.top >= 0 &&
          item.rect.bottom <= height,
      );
    }
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i].rect,
          b = placed[j].rect;
        assert.equal(
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
          false,
        );
      }
  }
});
test('only explicit development Demo accepts bounded count, open, question and mode queries', () => {
  const query = '?demo=1&units=15&open=15&questions=5&mode=video-only';
  assert.deepEqual(resolvePreviewOptions(query, false, config), {
    demo: false,
    course: config,
    openCount: null,
    questionCount: 0,
  });
  assert.deepEqual(resolvePreviewOptions(query, true, config), {
    demo: true,
    course: { ...config, totalUnits: 15, assignmentMode: 'video-only' },
    openCount: 15,
    questionCount: 5,
  });
  assert.equal(resolvePreviewOptions('?units=15&mode=video-only', true, config).demo, false);
  const bad = resolvePreviewOptions('?demo=1&units=99&open=-1&questions=8&mode=auto', true, config);
  assert.equal(bad.course.totalUnits, 12);
  assert.equal(bad.openCount, 4);
  assert.equal(bad.questionCount, 4);
  assert.equal(bad.course.assignmentMode, 'quiz');
  assert.equal(resolvePreviewOptions('?demo=1&units=1&open=15', true, config).openCount, 1);
});
test('75 roaming NPCs keep safe ground, separation, local bounds and movable roots after batching', () => {
  const world = make();
  world.optimize();
  const entries = [...world.motions.values()],
    moved = new Set();
  for (let frame = 0; frame <= 180; frame++) {
    world.update(frame / 6, 'overview', 8);
    for (const entry of entries) {
      const p = entry.npc.position;
      assert.ok(
        entry.safety.isSafe(p.x, p.z),
        `${entry.unitId}/${entry.questionId} stays on safe terrain`,
      );
      assert.ok(Math.hypot(p.x - entry.center.x, p.z - entry.center.z) <= entry.radius + 1e-5);
      assert.equal(entry.npc.userData.animated, true);
      if (Math.hypot(p.x - entry.center.x, p.z - entry.center.z) > 0.07) moved.add(entry);
    }
    for (const record of world.records.values())
      for (let i = 0; i < record.npcs.length; i++)
        for (let j = i + 1; j < record.npcs.length; j++)
          assert.ok(
            Math.hypot(
              record.npcs[i].position.x - record.npcs[j].position.x,
              record.npcs[i].position.z - record.npcs[j].position.z,
            ) >= 0.899,
          );
  }
  assert.equal(moved.size, 75, 'each NPC has a usable roaming area');
  const entry = entries[0],
    before = entry.npc.position.clone();
  world.setNpcPaused(entry.unitId, entry.questionId, true);
  for (let i = 1; i < 15; i++) world.update(30 + i / 6, 'S01', 40);
  assert.ok(entry.npc.position.equals(before));
  assert.equal(entry.motion.getState().paused, true);
  world.setNpcPaused(entry.unitId, entry.questionId, false);
  assert.equal(entry.motion.getState().paused, false);
  world.dispose();
});
