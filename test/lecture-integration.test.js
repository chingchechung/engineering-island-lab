import test from 'node:test';
import assert from 'node:assert/strict';
import { createIslandScene } from '../src/scene.js';

for (const mode of ['quiz', 'video-only'])
  test(`official ${mode} S01 Lecture opens through its Manifest without an NPC fixture`, () => {
    const world = createIslandScene(
      { courseTitle: '測試課程', totalUnits: 1, assignmentMode: mode },
      null,
      {
        manifest: {
          schemaVersion: 1,
          units: [{ unitId: 'S01', title: '第一單元', file: 'S01.json' }],
        },
      },
    );
    assert.deepEqual(world.labels.find((l) => l.id === 'lecture').action, {
      type: 'lecture',
      id: 'S01',
      unitId: 'S01',
    });
    assert.ok(world.pickables.some((o) => o.userData.action.type === 'lecture'));
    assert.equal(world.npcs.length, 0, 'Phase3 does not invent formal quiz questions');
    assert.equal(world.labels.find((l) => l.id === 'S01').kind, 'unit');
    assert.equal(world.records.get('S01').gate, undefined);
    world.optimize();
    assert.ok(world.pickables.some((o) => o.userData.action.type === 'lecture'));
    world.dispose();
  });
