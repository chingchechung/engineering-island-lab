import assert from 'node:assert/strict';
import test from 'node:test';
import { CameraRig } from '../src/camera.js';
import { createIslandScene } from '../src/scene.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';

function make(totalUnits = 12, open = 4, assignmentMode = 'quiz') {
  return createIslandScene({ courseTitle: 'Life pass', totalUnits, assignmentMode }, demoFixture, {
    manifest: createDemoManifest(totalUnits, open),
  });
}

for (const [units, mode] of [
  [12, 'quiz'],
  [15, 'quiz'],
  [15, 'video-only'],
])
  test(`${units} ${mode}: background life stays separate from fauna, framing and picking`, () => {
    const world = make(units, units, mode);
    try {
      assert.equal(world.animals.length, units * 3);
      assert.equal(world.seaLife.whales.length, 4);
      assert.ok(world.visitors.visitors.length >= 3 && world.visitors.visitors.length <= 8);
      assert.equal(world.seaLife.root.parent, world.scene);
      assert.equal(world.visitors.root.parent, world.scene);
      assert.equal(world.islands.children.length, units + 1);
      const bounds = world.bounds.clone();
      const rig = new CameraRig(bounds, 1366 / 638, world.framingPoints);
      const height = rig.height;
      world.optimize();
      for (let i = 0; i <= 90; i++) world.update(i / 6, 'overview', 8);
      assert.ok(world.bounds.equals(bounds));
      assert.equal(new CameraRig(world.bounds, 1366 / 638, world.framingPoints).height, height);
      for (const root of [world.seaLife.root, world.visitors.root])
        root.traverse((object) => {
          assert.equal(object.userData.action, undefined);
          assert.ok(!world.pickables.includes(object));
          assert.ok(!world.labels.some((label) => label.anchor === object));
        });
      assert.equal(world.npcs.length, mode === 'quiz' ? units * 4 : 0);
      assert.equal(world.motions.size, world.npcs.length);
      if (mode === 'video-only')
        assert.ok(!world.labels.some((label) => ['question', 'badge'].includes(label.kind)));
      const allowed = new Set(['academy', ...world.records.keys()]);
      for (const visitor of world.visitors.snapshot()) {
        if (visitor.unitId) assert.ok(allowed.has(visitor.unitId));
        if (visitor.from) assert.ok(allowed.has(visitor.from));
        if (visitor.to) assert.ok(allowed.has(visitor.to));
        assert.ok(visitor.position.every(Number.isFinite));
      }
    } finally {
      world.dispose();
    }
  });

test('empty official Manifest keeps all gates and zero visitors, with four background whales', () => {
  const world = make(12, 0);
  try {
    assert.equal(world.visitors.visitors.length, 0);
    assert.equal(world.visitors.snapshot().length, 0);
    assert.equal(world.seaLife.whales.length, 4);
    assert.equal([...world.records.values()].filter((r) => r.gate).length, 12);
    assert.equal(world.npcs.length, 0);
  } finally {
    world.dispose();
  }
});

test('a paused question NPC stays frozen while visitors, whales and all island fauna animate', () => {
  const world = make(12, 4);
  try {
    world.optimize();
    world.update(0, 'S01', 40);
    const entry = world.motions.get('S01/Q01');
    const npc = entry.npc.position.clone();
    const fauna = world.animals.map((a) => a.position.clone());
    const whales = world.seaLife.whales.map((a) => a.position.clone());
    const visitors = world.visitors.visitors.map((a) => a.position.clone());
    assert.equal(world.setNpcPaused('S01', 'Q01', true), true);
    for (let i = 1; i <= 120; i++) world.update(i / 6, 'S01', 40);
    assert.ok(entry.npc.position.equals(npc));
    assert.ok(world.animals.every((animal, i) => animal.position.distanceTo(fauna[i]) > 0.001));
    assert.ok(
      world.seaLife.whales.every((animal, i) => animal.position.distanceTo(whales[i]) > 0.001),
    );
    assert.ok(
      world.visitors.visitors.some((visitor, i) => visitor.position.distanceTo(visitors[i]) > 0.05),
    );
    world.setNpcPaused('S01', 'Q01', false);
    assert.equal(entry.motion.getState().paused, false);
    assert.equal(world.setNpcPaused('S01', 'missing', true), false);
  } finally {
    world.dispose();
  }
});
