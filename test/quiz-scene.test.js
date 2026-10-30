import test from 'node:test';
import assert from 'node:assert/strict';
import { createIslandScene } from '../src/scene.js';
import { createDemoManifest } from '../src/demo/fixture.js';
import { createDemoQuizReader } from '../src/demo/quiz-fixture.js';
import { validateUnit } from '../src/quiz-contract.js';
import { validateManifest } from '../src/config.js';

test('each validated unit independently maps four/five IDs onto the accepted NPCs and motions', async () => {
  const assignments = new Map();
  for (const id of ['S01', 'S02', 'S03', 'S04']) {
    const unit = await createDemoQuizReader()(id);
    assert.deepEqual(validateUnit(unit, `${id}.json`), []);
    assignments.set(id, unit);
  }
  const world = createIslandScene(
    { courseTitle: 'Test', totalUnits: 4, assignmentMode: 'quiz' },
    null,
    { manifest: createDemoManifest(4, 4), assignments },
  );
  try {
    assert.deepEqual(
      [...world.records.values()].map((record) => record.npcs.length),
      [4, 5, 4, 5],
    );
    assert.equal(
      world.labels.some((label) => label.id === 'Q05'),
      false,
    );
    assert.equal(
      world.labels.some((label) => label.id === 'S02-Q05'),
      true,
    );
    world.optimize();
    world.update(2, 'S02');
    assert.equal(world.setNpcPaused('S02', 'Q05', true), true);
    const position = world.motions.get('S02/Q05').npc.position.clone();
    world.update(4, 'S02');
    assert.ok(position.equals(world.motions.get('S02/Q05').npc.position));
    assert.equal(world.animals.length, 12);
  } finally {
    world.dispose();
  }
});

test('failed assignment generates no placeholder NPC; video-only ignores even supplied assignments', async () => {
  const manifest = createDemoManifest(2, 2);
  for (const mode of ['quiz', 'video-only']) {
    const assignments = new Map([['S02', await createDemoQuizReader()('S02')]]);
    const world = createIslandScene(
      { courseTitle: 'Test', totalUnits: 2, assignmentMode: mode },
      null,
      { manifest, assignments },
    );
    try {
      assert.equal(world.records.get('S01').npcs.length, 0);
      assert.equal(world.records.get('S02').npcs.length, mode === 'quiz' ? 5 : 0);
      assert.equal(world.labels.find((label) => label.id === 'lecture').action.type, 'lecture');
    } finally {
      world.dispose();
    }
  }
});

test('shared Manifest validation rejects unknown fields and malformed type/newline even without Quiz runtime', () => {
  for (const manifest of [
    { ...createDemoManifest(1, 1), secret: true },
    { schemaVersion: 1, units: [{ unitId: 'S01\n', file: 'S01\n.json', title: 'x' }] },
    { schemaVersion: 1, units: [{ unitId: 1, file: '1.json', title: 'x' }] },
    { schemaVersion: 1, units: [{ unitId: 'S01', file: 'S01.json', title: 'x', answer: 'x' }] },
  ])
    assert.throws(() => validateManifest(manifest, 15));
});
