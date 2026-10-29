import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Raycaster, Vector2, Vector3 } from 'three';
import { CameraRig } from '../src/camera.js';
import { createIslandFauna } from '../src/world/fauna.js';
import { sharkPose } from '../src/world/animals.js';
import { createPhaseOneScene } from '../src/world/phase-one.js';
import { createThemeIsland } from '../src/world/themes.js';
import { PRESETS } from '../src/world/presets.js';
import { batchStatic, disposeScene } from '../src/world/optimize.js';

const kinds = [
  'shark',
  'fish',
  'penguin',
  'jellyfish',
  'dinosaur',
  'sheep',
  'arctic-fox',
  'duck',
  'butterfly',
  'camel',
  'whale',
  'flamingo',
  'panda',
  'crystal',
  'turtle',
];

function makeRecords(t) {
  const base = createPhaseOneScene({
    courseTitle: 'Fauna test',
    totalUnits: 15,
    assignmentMode: 'video-only',
  });
  const first = {
    root: base.forest,
    animals: [base.shark],
    top: 0.8,
    preset: PRESETS[0],
    house: base.forest.getObjectByName('lecture-cottage'),
    terrain: base.forest.getObjectByName('coast-and-cliffs'),
  };
  const records = [
    first,
    ...PRESETS.slice(1).map((preset) => ({ ...createThemeIsland(preset), preset })),
  ];
  t.after(() => {
    disposeScene(base.scene);
    records.slice(1).forEach((record) => disposeScene(record.root));
  });
  return records;
}

function transform(object) {
  return [
    ...object.position.toArray(),
    ...object.rotation.toArray().slice(0, 3),
    ...object.scale.toArray(),
  ];
}

function finiteGeometry(group) {
  let meshes = 0;
  group.traverse((part) => {
    assert.ok(!part.userData.action, `${group.name} must have no interaction action`);
    assert.ok(transform(part).every(Number.isFinite));
    if (!part.isMesh) return;
    meshes++;
    assert.ok(part.visible);
    const positions = part.geometry.getAttribute('position');
    assert.ok(positions.count > 0);
    assert.ok(positions.array.every(Number.isFinite));
  });
  return meshes;
}

test('all fifteen islands contain exactly three independent animals of unique representative species', (t) => {
  const records = makeRecords(t),
    individuals = new Set();
  records.forEach((record, i) => {
    const old = (record.creatures ?? []).map((motion) => motion.group);
    const motions = createIslandFauna(record);
    assert.equal(motions.length, 3);
    assert.deepEqual(
      motions.map((motion) => motion.kind),
      [kinds[i], kinds[i], kinds[i]],
    );
    for (const motion of motions) {
      assert.deepEqual(Object.keys(motion).sort(), ['group', 'kind', 'update']);
      assert.equal(motion.group.parent, record.root);
      assert.equal(motion.group.userData.decoration, true);
      assert.equal(motion.group.userData.animated, true);
      assert.ok(
        finiteGeometry(motion.group) >= 6,
        'an animal has a visible body, face and appendages',
      );
      individuals.add(motion.group);
    }
    assert.ok(
      old.every((group) => !group.parent),
      'old species are detached, including the S09 jellyfish',
    );
    assert.equal(new Set(motions.map((motion) => motion.group.scale.x)).size, 3);
  });
  assert.equal(individuals.size, 45);
  assert.equal(new Set(kinds).size, 15);
});

test('S01 retains the accepted shark object, all original geometry and its exact autonomous pose', (t) => {
  const record = makeRecords(t)[0],
    original = record.animals[0];
  const geometries = original.children.map((part) => part.geometry);
  const materials = original.children.map((part) => part.material);
  const motions = createIslandFauna(record);
  assert.equal(motions[0].group, original);
  assert.deepEqual(
    original.children.map((part) => part.geometry),
    geometries,
  );
  assert.deepEqual(
    original.children.map((part) => part.material),
    materials,
  );
  motions[0].update(8.4);
  const pose = sharkPose(8.4);
  assert.deepEqual(original.position.toArray(), [pose.x, pose.y, pose.z]);
  assert.equal(original.rotation.y, pose.rotation);
  assert.equal(original.scale.y, pose.stretch);
  const companions = motions.slice(1).map((motion) => motion.group);
  const secondPass = createIslandFauna({ ...record, creatures: motions });
  assert.equal(secondPass[0].group, original);
  assert.ok(companions.every((group) => group.parent === null));
  assert.equal(
    record.root.children.filter((group) => group.userData.species === 'shark').length,
    3,
  );
});

test('animal paths and appendage poses depend only on absolute time and never move in synchrony', (t) => {
  for (const record of makeRecords(t)) {
    const motions = createIslandFauna(record);
    const starts = motions.map((motion) => motion.group.position.clone());
    motions.forEach((motion) => motion.update(0.7));
    const deltas = motions.map((motion, i) => motion.group.position.clone().sub(starts[i]));
    deltas.forEach((delta) => assert.ok(delta.length() > 0.01));
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        assert.ok(
          deltas[i].distanceTo(deltas[j]) > 0.01,
          `${record.preset.id} has independent motion phases`,
        );
    for (const motion of motions) {
      motion.update(19.2);
      const expected = [];
      motion.group.traverse((part) => expected.push(transform(part)));
      motion.update(0.2);
      motion.update(19.2);
      const actual = [];
      motion.group.traverse((part) => actual.push(transform(part)));
      assert.deepEqual(actual, expected);
      for (const seconds of [0, 1.8, 11, 60, 400]) {
        motion.update(seconds);
        assert.ok(Math.abs(motion.group.position.x) < 2.1);
        assert.ok(motion.group.position.z > -1.5 && motion.group.position.z < 0.7);
        assert.ok(motion.group.position.y >= record.top + 0.05);
        finiteGeometry(motion.group);
      }
    }
  }
});

test('world and animal batching retain independent roots and articulated motion', (t) => {
  for (const record of makeRecords(t)) {
    const motions = createIslandFauna(record);
    batchStatic(record.root);
    for (const motion of motions) {
      assert.equal(motion.group.parent, record.root);
      batchStatic(motion.group);
      const movingParts = [];
      motion.group.traverse((part) => {
        if (part !== motion.group && part.userData.animated) movingParts.push(part);
      });
      movingParts.filter((part) => part.isGroup).forEach(batchStatic);
      motion.update(0);
      const before = movingParts.map(transform);
      const position = motion.group.position.clone();
      let articulated = false;
      for (const seconds of [0.43, 1.4, 2.1]) {
        motion.update(seconds);
        articulated ||= movingParts.some((part, i) =>
          transform(part).some((v, j) => Math.abs(v - before[i][j]) > 0.01),
        );
      }
      assert.ok(motion.group.position.distanceTo(position) > 0.01);
      if (motion.kind !== 'shark') {
        assert.ok(movingParts.length > 0);
        assert.ok(articulated, `${record.preset.id} ${motion.group.name} articulation`);
      }
      assert.ok(finiteGeometry(motion.group) >= 1);
    }
  }
});

test('all forty-five bodies remain exposed to the fixed camera through sampled autonomous poses', (t) => {
  for (const record of makeRecords(t)) {
    const motions = createIslandFauna(record);
    const rig = new CameraRig(new Box3().setFromObject(record.root), 1.3);
    batchStatic(record.root);
    motions.forEach((motion) => batchStatic(motion.group));
    const meshes = [];
    record.root.traverse((object) => {
      if (object.isMesh) meshes.push(object);
    });
    for (const seconds of [0, 0.7, 1.2, 5, 11, 19.2, 45, 60]) {
      motions.forEach((motion) => motion.update(seconds));
      record.animate?.forEach((update) => update(seconds));
      record.root.updateMatrixWorld(true);
      for (const motion of motions) {
        const bodyY = motion.kind === 'flamingo' ? 0.96 : 0.5;
        const point = motion.group.localToWorld(new Vector3(0, bodyY, 0)).project(rig.camera);
        const ray = new Raycaster();
        ray.setFromCamera(new Vector2(point.x, point.y), rig.camera);
        const firstHit = ray.intersectObjects(meshes, false)[0]?.object;
        let belongsToAnimal = false;
        for (let part = firstHit; part; part = part.parent)
          if (part === motion.group) belongsToAnimal = true;
        assert.ok(belongsToAnimal, `${record.preset.id} ${motion.group.name} at ${seconds}s`);
      }
    }
  }
});

test('replacing source fauna releases dedicated geometry while retaining shared primitives', (t) => {
  const record = makeRecords(t)[8];
  const jellyfish = record.creatures.find((motion) => motion.kind === 'jellyfish').group;
  const torus = jellyfish.children.find((part) => part.geometry?.type === 'TorusGeometry').geometry;
  const sphere = jellyfish.children.find(
    (part) => part.geometry?.type === 'SphereGeometry',
  ).geometry;
  let dedicatedDisposals = 0,
    sharedDisposals = 0;
  torus.addEventListener('dispose', () => dedicatedDisposals++);
  sphere.addEventListener('dispose', () => sharedDisposals++);
  const first = createIslandFauna(record);
  assert.equal(dedicatedDisposals, 1);
  assert.equal(sharedDisposals, 0);
  const again = createIslandFauna({ ...record, creatures: first });
  assert.equal(again.length, 3);
  assert.ok(first.every((motion) => motion.group.parent === null));
  assert.equal(
    record.root.children.filter((group) => group.userData.species === 'butterfly').length,
    3,
  );
  assert.equal(sharedDisposals, 0);
});
