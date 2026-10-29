import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Matrix4, Vector3 } from 'three';
import { createIslandScene } from '../src/scene.js';
import { addIslandDressing } from '../src/world/dressing.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';
import { batchStatic } from '../src/world/optimize.js';

function world(mode = 'video-only') {
  return createIslandScene(
    { courseTitle: 'Dressing', totalUnits: 15, assignmentMode: mode },
    demoFixture,
    { manifest: createDemoManifest(15, 15) },
  );
}

const npcCenters = [
  [-2.8, 2],
  [-0.9, 3.1],
  [1.3, 2.8],
  [3, 1.5],
  [3.6, 0.1],
];
const animalCenters = [
  [0.4, 0.3],
  [1.7, -0.4],
  [0.15, -1.3],
];

test('every theme has rich static dressing with finite local geometry and instanced plants', () => {
  const scene = world(),
    signatures = new Set();
  let triangles = 0,
    totalInstances = 0;
  for (const [id, record] of scene.records) {
    const terrainPositions = record.terrain.geometry.getAttribute('position').array.slice();
    const { group, count, placements } = addIslandDressing(record);
    assert.equal(group.name, 'themed-dressing');
    assert.equal(group.parent, record.root);
    assert.ok(count >= 30, `${id} has substantial dressing`);
    assert.ok(placements.length >= 10);
    const kinds = [...new Set(placements.map((p) => p.kind))];
    signatures.add(kinds.join('|'));
    let instanceCount = 0,
      vertices = 0;
    group.traverse((o) => {
      assert.equal(o.userData.action, undefined);
      assert.equal(Boolean(o.userData.animated), false);
      assert.equal(Boolean(o.userData.detail), false, 'dressing remains present in overview');
      if (!o.isMesh) return;
      const position = o.geometry.getAttribute('position');
      vertices += position.count;
      for (const attribute of Object.values(o.geometry.attributes))
        for (const n of attribute.array) assert.ok(Number.isFinite(n), `${id} has finite geometry`);
      const multiplier = o.isInstancedMesh ? o.count : 1;
      triangles += ((o.geometry.index?.count ?? position.count) / 3) * multiplier;
      if (o.isInstancedMesh) {
        instanceCount += o.count;
        for (const n of o.instanceMatrix.array) assert.ok(Number.isFinite(n));
      }
    });
    assert.ok(vertices > 1500);
    assert.ok(instanceCount >= 24);
    totalInstances += instanceCount;
    assert.deepEqual(
      record.terrain.geometry.getAttribute('position').array,
      terrainPositions,
      'dressing does not relocate the accepted base terrain',
    );
    const local = new Box3().setFromObject(group).translate(record.root.position.clone().negate());
    assert.ok(local.min.x > -7 && local.max.x < 7 && local.min.z > -7 && local.max.z < 7);
  }
  assert.equal(signatures.size, 15, 'all fifteen themes have distinct authored feature sets');
  assert.ok(totalInstances >= 500);
  assert.ok(triangles < 40000, `static detail stays within a modest triangle budget: ${triangles}`);
  scene.dispose();
});

test('new surface props preserve cottage, complete NPC roam discs, animal clearings and bridge height', () => {
  const scene = world();
  for (const [id, record] of scene.records) {
    const { group, placements } = addIslandDressing(record);
    for (const p of placements) {
      if (p.baseY + p.height <= record.top + 0.2) continue;
      for (const [x, z] of npcCenters)
        assert.ok(
          Math.hypot(p.x - x, p.z - z) >= 1.25 + p.radius,
          `${id} ${p.kind} clears NPC roam`,
        );
      for (const [x, z] of animalCenters)
        assert.ok(
          Math.hypot(p.x - x, p.z - z) >= 0.88 + p.radius,
          `${id} ${p.kind} clears animals`,
        );
      assert.ok(
        p.x <= -3.85 - p.radius ||
          p.x >= -0.7 + p.radius ||
          p.z <= -1.55 - p.radius ||
          p.z >= 1.55 + p.radius,
        `${id} clears Lecture face`,
      );
    }
    record.root.updateWorldMatrix(true, true);
    const inverse = record.root.matrixWorld.clone().invert(),
      matrix = new Matrix4(),
      point = new Vector3();
    // Check actual generated vertices too, including every instance transform.
    group.traverse((o) => {
      if (!o.isMesh) return;
      const position = o.geometry.getAttribute('position'),
        local = inverse.clone().multiply(o.matrixWorld);
      for (let instance = 0; instance < (o.isInstancedMesh ? o.count : 1); instance++) {
        if (o.isInstancedMesh) o.getMatrixAt(instance, matrix);
        else matrix.identity();
        const transform = local.clone().multiply(matrix);
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i).applyMatrix4(transform);
          if (point.y <= record.top + 0.2) continue;
          for (const [x, z] of npcCenters)
            assert.ok(
              Math.hypot(point.x - x, point.z - z) > 1.05,
              `${id} actual vertex clears NPC`,
            );
          for (const [x, z] of animalCenters)
            assert.ok(
              Math.hypot(point.x - x, point.z - z) > 0.7,
              `${id} actual vertex clears animal`,
            );
          assert.ok(point.z < -0.7, `${id} keeps front bridge and interaction banks clear`);
        }
      }
    });
  }
  scene.dispose();
});

test('dressing is identical between quiz and video-only and adding it twice is idempotent', () => {
  const quiz = world('quiz'),
    video = world();
  for (const [id, record] of quiz.records) {
    const a = addIslandDressing(record),
      b = addIslandDressing(video.records.get(id));
    assert.equal(a.count, b.count);
    assert.deepEqual(a.placements, b.placements);
    const second = addIslandDressing(record);
    assert.equal(a.group, second.group);
    assert.equal(second.count, a.count);
    assert.equal(record.root.children.filter((o) => o.name === 'themed-dressing').length, 1);
  }
  quiz.dispose();
  video.dispose();
});

test('static batching keeps decorative bounds, materials, instances and has no interactive geometry', () => {
  const scene = world();
  for (const [id, record] of scene.records) {
    const { group } = addIslandDressing(record),
      before = new Box3().setFromObject(group, true);
    let beforeMeshes = 0;
    const instanced = [];
    group.traverse((o) => {
      if (o.isMesh) beforeMeshes++;
      if (o.isInstancedMesh) instanced.push(o);
    });
    batchStatic(group);
    let afterMeshes = 0;
    group.traverse((o) => {
      if (o.isMesh) {
        afterMeshes++;
        assert.equal(o.userData.action, undefined);
      }
    });
    const after = new Box3().setFromObject(group, true);
    assert.ok(
      after.min.distanceTo(before.min) < 1e-5 && after.max.distanceTo(before.max) < 1e-5,
      `${id} bounds survive batching`,
    );
    assert.ok(
      afterMeshes <= instanced.length + 4,
      `${id} static props collapse into a few batches`,
    );
    assert.ok(afterMeshes < beforeMeshes / 2);
    for (const o of instanced) assert.equal(o.parent, group);
  }
  scene.dispose();
});
