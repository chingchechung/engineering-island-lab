import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Group, Vector3 } from 'three';
import { createSeaLife } from '../src/world/sea-life.js';
import { batchStatic, disposeScene } from '../src/world/optimize.js';
import { isSharedGeometry, isSharedMaterial } from '../src/world/primitives.js';

const bounds = () => new Box3(new Vector3(-62, -4, -43), new Vector3(48, 13, 46));
const point = new Vector3();

function sea(t, options = {}) {
  const result = createSeaLife({ bounds: bounds(), ...options });
  t.after(() => disposeScene(result.root));
  return result;
}

function distanceFromBoxXZ(x, z, box) {
  return Math.hypot(
    Math.max(box.min.x - x, 0, x - box.max.x),
    Math.max(box.min.z - z, 0, z - box.max.z),
  );
}

function animationState(system) {
  const result = [system.snapshot()];
  system.root.traverse((object) => {
    result.push([
      ...object.position.toArray(),
      ...object.quaternion.toArray(),
      ...object.scale.toArray(),
    ]);
    if (object.isInstancedMesh) {
      result.push([...object.instanceMatrix.array]);
      if (object.instanceColor) result.push([...object.instanceColor.array]);
    }
    if (object.material?.uniforms?.time) result.push(object.material.uniforms.time.value);
  });
  return result;
}

test('sea life is a separate decorative system with four large shadow-free articulated whales', (t) => {
  const box = bounds(),
    before = box.clone(),
    system = sea(t, { bounds: box });
  assert.deepEqual(box, before, 'framing bounds are never expanded or changed');
  assert.equal(system.root.parent, null);
  assert.equal(system.whales.length, 4);
  assert.equal(new Set(system.whales).size, 4);
  assert.equal(system.root.userData.offshoreClearance, system.route.clearance);
  assert.equal(system.root.userData.whaleEnvelopeRadius, system.route.envelopeRadius);
  assert.ok(system.snapshot().seaY < -2.55, 'water stays below the existing shadow receiver');
  assert.equal(system.snapshot().seaTime, 0);
  system.root.traverse((object) => {
    assert.equal(object.userData.decoration, true, object.name);
    assert.equal(object.userData.action, undefined);
    assert.ok(!object.userData.label);
    if (object.isMesh) {
      assert.equal(object.castShadow, false);
      assert.equal(object.receiveShadow, false);
      assert.ok(object.geometry.getAttribute('position').array.every(Number.isFinite));
    }
  });
  for (const whale of system.whales) {
    assert.equal(whale.parent, system.root);
    assert.equal(whale.userData.animated, true);
    const joints = whale.children.filter((child) => child.userData.animated);
    assert.equal(joints.length, 3, 'two flippers and one tail retain their local frames');
    assert.ok(joints.every((joint) => joint.children.some((child) => child.isMesh)));
    assert.ok(new Box3().setFromObject(whale).getSize(point).length() > 7);
  }
});

test('rounded offshore routes and all moving geometry clear the whole supplied box', (t) => {
  // Wide, deep, translated and zero-width boxes catch ellipse/corner assumptions.
  for (const box of [
    bounds(),
    new Box3(new Vector3(107, -8, -5), new Vector3(243, 10, 7)),
    new Box3(new Vector3(-8, -4, -91), new Vector3(9, 8, 74)),
    new Box3(new Vector3(3, -1, -2), new Vector3(3, 2, 4)),
  ]) {
    const system = sea(t, { bounds: box }),
      { route } = system;
    for (let i = 0; i <= 600; i++) {
      const position = route.sample((i * route.perimeter) / 600);
      assert.ok(Math.abs(distanceFromBoxXZ(position.x, position.z, box) - route.offset) < 1e-8);
      assert.ok(Number.isFinite(position.heading));
    }
    for (let i = 0; i < 28; i++) {
      system.update((i * route.perimeter) / (28 * route.speed));
      system.root.updateMatrixWorld(true);
      for (const whale of system.whales) {
        whale.traverse((part) => {
          if (!part.isMesh) return;
          const vertices = part.geometry.getAttribute('position');
          for (let j = 0; j < vertices.count; j++) {
            point.fromBufferAttribute(vertices, j).applyMatrix4(part.matrixWorld);
            assert.ok(
              Math.hypot(point.x - whale.position.x, point.z - whale.position.z) <=
                route.envelopeRadius,
              `${whale.name} stays inside its declared moving envelope`,
            );
            assert.ok(
              distanceFromBoxXZ(point.x, point.z, box) >= route.clearance - 1e-5,
              `${whale.name} fins/tail must clear islands and bridges`,
            );
          }
        });
      }
    }
  }
});

test('water, whales, joints, wakes and spray depend only on absolute time', (t) => {
  const system = sea(t),
    initial = animationState(system),
    fins = system.whales.map((whale) => whale.getObjectByName('whale-flipper-left')),
    before = fins.map((fin) => fin.rotation.z);
  system.update(0.7);
  assert.notDeepEqual(animationState(system), initial);
  assert.ok(fins.every((fin, i) => Math.abs(fin.rotation.z - before[i]) > 0.01));
  assert.equal(new Set(fins.map((fin) => fin.rotation.z)).size, 4);
  for (const seconds of [0, 0.81, 7.5, 43.25, 1100, -3]) {
    system.update(seconds);
    const expected = animationState(system);
    system.update(seconds + 19);
    system.update(seconds - 4);
    system.update(seconds);
    assert.deepEqual(animationState(system), expected);
    assert.equal(system.snapshot().seaTime, seconds);
  }
  const snapshot = system.snapshot();
  snapshot.whales[0].position[0] = 999;
  assert.notEqual(system.snapshot().whales[0].position[0], 999, 'snapshot is detached data');
});

test('spouts are visible immediately, then intermittent and staggered across all four whales', (t) => {
  const system = sea(t),
    seen = new Set(),
    off = new Set();
  assert.equal(system.snapshot().whales.filter((whale) => whale.spouting).length, 1);
  for (let i = 0; i <= 360; i++) {
    system.update(i / 20);
    const whales = system.snapshot().whales;
    assert.ok(whales.filter((whale) => whale.spouting).length <= 1);
    for (const whale of whales) {
      if (whale.spouting) {
        seen.add(whale.id);
        assert.ok(whale.spoutPhase >= 0 && whale.spoutPhase < 1);
      } else {
        off.add(whale.id);
        assert.equal(whale.spoutPhase, null);
      }
    }
  }
  assert.equal(seen.size, 4);
  assert.equal(off.size, 4);
});

test('local batching holds the cost to nineteen draws and preserves world batching and motion', (t) => {
  const system = sea(t),
    parent = new Group();
  parent.add(system.root);
  let draws = 0,
    triangles = 0;
  const meshes = [];
  system.root.traverse((object) => {
    if (!object.isMesh) return;
    draws++;
    meshes.push(object);
    triangles +=
      ((object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3) *
      (object.isInstancedMesh ? object.count : 1);
  });
  assert.equal(draws, 19);
  assert.ok(triangles < 10000, `actual maximum submission: ${triangles} triangles`);
  assert.equal(meshes.filter((mesh) => mesh.isInstancedMesh).length, 2);
  assert.ok(meshes.filter((mesh) => mesh.isInstancedMesh).every((mesh) => mesh.count <= 28));
  const expected = animationState(system);
  batchStatic(parent);
  assert.ok(
    meshes.every((mesh) => mesh.parent),
    'world batching cannot absorb new moving meshes',
  );
  assert.equal(system.root.parent, parent);
  assert.deepEqual(animationState(system), expected);
  system.update(1.2);
  assert.notDeepEqual(animationState(system), expected);
});

test('existing scene disposal releases each dedicated geometry/material exactly once', () => {
  const system = createSeaLife({ bounds: bounds() }),
    resources = new Map();
  system.root.traverse((object) => {
    for (const resource of [
      object.geometry && !isSharedGeometry(object.geometry) ? object.geometry : null,
      object.material && !isSharedMaterial(object.material) ? object.material : null,
    ]) {
      if (!resource || resources.has(resource)) continue;
      resources.set(resource, 0);
      resource.addEventListener('dispose', () =>
        resources.set(resource, resources.get(resource) + 1),
      );
    }
  });
  disposeScene(system.root);
  assert.ok(resources.size > 10);
  assert.ok([...resources.values()].every((count) => count === 1));
});

test('zero whales retains water and malformed inputs fail before creating scene resources', (t) => {
  const system = sea(t, { count: 0, seaY: -4 });
  system.update(5);
  assert.equal(system.root.children.length, 1);
  assert.deepEqual(system.snapshot(), { seaTime: 5, seaY: -4.035, whales: [] });
  for (const bad of [null, new Box3(), new Box3(new Vector3(NaN, 0, 0), new Vector3(1, 1, 1))])
    assert.throws(() => createSeaLife({ bounds: bad }), /bounds/);
  for (const count of [-1, 0.2, Infinity])
    assert.throws(() => createSeaLife({ bounds: bounds(), count }), /count/);
  assert.throws(() => createSeaLife({ bounds: bounds(), seaY: NaN }), /height/);
  assert.throws(() => system.update(Infinity), /seconds/);
});
