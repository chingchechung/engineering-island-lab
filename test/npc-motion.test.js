import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Group, Vector3 } from 'three';
import { createNpcMotion } from '../src/world/npc-motion.js';
import { createNpc } from '../src/world/props.js';
import { batchStatic } from '../src/world/optimize.js';

function controller(options = {}, npc = new Group()) {
  return {
    npc,
    motion: createNpcMotion(npc, {
      center: new Vector3(0, 0.97, 0),
      seed: 42,
      isSafe: () => true,
      ...options,
    }),
  };
}

function transforms(root) {
  const values = [];
  root.traverse((object) => values.push([...object.position, ...object.rotation.toArray()]));
  return values;
}

function reachWalk(motion) {
  let time = 0;
  motion.update(time);
  for (let i = 0; i < 1800; i++) {
    time += 1 / 60;
    motion.update(time);
    if (motion.getState().phase === 'walk') {
      motion.update((time += 0.1));
      return time;
    }
  }
  assert.fail('an unobstructed NPC should start walking');
}

test('NPC motion preserves the model, action identity and attached labels through batching', () => {
  const island = new Group(),
    npc = createNpc({ id: 'Q03', color: '#dd8d85' }),
    label = new Group(),
    action = { type: 'npc', id: 'Q03', unitId: 'S01' };
  npc.add(label);
  label.position.set(0, 2, 0);
  island.add(npc);
  npc.position.set(2, 0.97, -1);
  const original = new Map();
  npc.traverse((object) => {
    if (object.isMesh) {
      object.userData.action = action;
      original.set(object, object.getWorldPosition(new Vector3()));
    }
  });
  const { motion } = controller({ center: npc.position.clone() }, npc);
  assert.equal(npc.userData.animated, true);
  assert.equal(npc.name, 'npc-Q03');
  for (const [mesh, position] of original) {
    assert.ok(mesh.getWorldPosition(new Vector3()).distanceTo(position) < 1e-10);
    assert.equal(mesh.userData.action, action);
  }
  const limbs = npc.children.filter((object) => object.name.startsWith('npc-motion-'));
  assert.equal(limbs.length, 4);
  assert.ok(limbs.every((object) => object.userData.animated));
  batchStatic(island);
  assert.ok([...original.keys()].every((mesh) => mesh.parent));
  batchStatic(npc);
  limbs.forEach((limb) => batchStatic(limb));
  assert.equal(label.parent, npc);
  const before = new Box3().setFromObject(npc).getCenter(new Vector3());
  npc.position.x += 0.4;
  const after = new Box3().setFromObject(npc).getCenter(new Vector3());
  assert.ok(Math.abs(after.x - before.x - 0.4) < 1e-8);
  assert.ok(Math.abs(label.getWorldPosition(new Vector3()).x - npc.position.x) < 1e-8);
  reachWalk(motion);
  assert.ok(limbs.some((limb) => Math.abs(limb.rotation.x) > 0.001));
});

test('seeded roaming uses idle, turn and walk phases inside its finite circle at a clickable speed', () => {
  const center = new Vector3(3, 0.97, -2),
    a = controller({ center, radius: 1.2 }),
    b = controller({ center, radius: 1.2 }),
    different = controller({ center, radius: 1.2, seed: 43 }),
    phases = new Set();
  let distance = 0;
  for (let i = 0; i <= 1800; i++) {
    const previous = a.npc.position.clone();
    for (const entry of [a, b, different]) entry.motion.update(i / 30);
    const step = a.npc.position.distanceTo(previous);
    distance += step;
    assert.ok(step <= 0.28 / 30 + 1e-8);
    assert.ok(Math.hypot(a.npc.position.x - center.x, a.npc.position.z - center.z) <= 1.2);
    assert.deepEqual(a.npc.position, b.npc.position);
    assert.deepEqual(a.motion.getState(), b.motion.getState());
    phases.add(a.motion.getState().phase);
  }
  assert.ok(distance > 2, 'the NPC should visibly explore its clearing');
  assert.deepEqual(phases, new Set(['idle', 'turn', 'walk']));
  assert.ok(a.npc.position.distanceTo(different.npc.position) > 0.01);
});

test('near and 6 Hz overview updates produce the same deterministic route', () => {
  const near = controller(),
    far = controller();
  for (let i = 0; i <= 1800; i++) near.motion.update(i / 60);
  for (let i = 0; i <= 180; i++) far.motion.update(i / 6);
  assert.ok(near.npc.position.distanceTo(far.npc.position) < 1e-9);
  assert.ok(Math.abs(near.npc.rotation.y - far.npc.rotation.y) < 1e-9);
  assert.deepEqual(near.motion.getState(), far.motion.getState());
});

test('safe endpoints across an unsafe wall are rejected and every travelled segment stays on land', () => {
  const isSafe = (x, z) => Math.abs(x) > 0.12 && Math.abs(z) < 1.3,
    { npc, motion } = controller({ center: new Vector3(-0.45, 0.97, 0), radius: 1.35, isSafe });
  let travelled = 0;
  for (let i = 0; i <= 1200; i++) {
    const previous = npc.position.clone();
    motion.update(i / 10);
    travelled += previous.distanceTo(npc.position);
    assert.ok(npc.position.x < -0.12, 'cannot cross the wall to the other safe shore');
    for (let sample = 0; sample <= 10; sample++) {
      const point = previous.clone().lerp(npc.position, sample / 10);
      assert.ok(isSafe(point.x, point.z));
    }
  }
  assert.ok(travelled > 1, 'available safe space should still be used');
});

test('walking rechecks safety immediately when the environment changes', () => {
  let safe = true;
  const { npc, motion } = controller({ isSafe: () => safe }),
    time = reachWalk(motion),
    previous = npc.position.clone();
  safe = false;
  motion.update(time + 0.1);
  assert.deepEqual(npc.position, previous);
  assert.equal(motion.getState().phase, 'idle');
  for (let i = 1; i <= 200; i++) motion.update(time + i / 10);
  assert.deepEqual(npc.position, previous);
  safe = true;
  for (let i = 201; i <= 500; i++) motion.update(time + i / 10);
  assert.ok(npc.position.distanceTo(previous) > 0.01);
});

test('ground height follows gentle slopes while missing ground and a cliff remain impassable', () => {
  const heightAt = (x, z) => (z > 0.35 ? null : 0.8 + x * 0.12 - z * 0.04 + (x > 0.35 ? 1 : 0)),
    { npc, motion } = controller({ heightAt });
  let travelled = 0;
  for (let i = 0; i <= 1800; i++) {
    const previous = npc.position.clone();
    motion.update(i / 20);
    travelled += previous.distanceTo(npc.position);
    assert.ok(npc.position.z <= 0.35);
    assert.ok(npc.position.x <= 0.35);
    assert.ok(Math.abs(npc.position.y - heightAt(npc.position.x, npc.position.z) - 0.17) < 1e-8);
    assert.ok(Math.abs(previous.y - npc.position.y) < 0.02);
  }
  assert.ok(travelled > 1);
});

test('pause immediately freezes root and limbs and resume never replays Modal time', () => {
  const npc = createNpc({ id: 'Q01', color: '#8bafbd' }),
    { motion } = controller({}, npc);
  let time = reachWalk(motion);
  const previous = transforms(npc),
    state = motion.getState();
  motion.setPaused(true);
  assert.equal(motion.getState().paused, true);
  assert.deepEqual(transforms(npc), previous);
  for (let i = 1; i <= 10; i++) motion.update(time + i * 100);
  assert.deepEqual(transforms(npc), previous);
  assert.equal(motion.getState().phase, state.phase);
  assert.deepEqual(motion.getState().target, state.target);
  motion.setPaused(false);
  motion.update((time += 10000));
  assert.deepEqual(transforms(npc), previous);
  const position = npc.position.clone();
  motion.update((time += 0.1));
  assert.ok(npc.position.distanceTo(position) > 0);
  assert.ok(npc.position.distanceTo(position) <= 0.028 + 1e-8);

  motion.setPaused(true);
  motion.setPaused(false);
  const noPausedUpdates = transforms(npc);
  motion.update(time + 10000);
  assert.deepEqual(transforms(npc), noPausedUpdates);
});

test('independent NPCs keep their personal space when their roaming circles overlap', () => {
  const left = new Group(),
    right = new Group(),
    peers = () => [left, right],
    a = controller({ center: new Vector3(-0.65, 0.97, 0), seed: 2, peers }, left),
    b = controller({ center: new Vector3(0.65, 0.97, 0), seed: 19, peers }, right),
    starts = [left.position.clone(), right.position.clone()];
  let leftTravel = 0,
    rightTravel = 0;
  for (let i = 0; i <= 900; i++) {
    const previousLeft = left.position.clone(),
      previousRight = right.position.clone();
    a.motion.update(i / 6);
    b.motion.update(i / 6);
    leftTravel += previousLeft.distanceTo(left.position);
    rightTravel += previousRight.distanceTo(right.position);
    assert.ok(left.position.distanceTo(right.position) >= 0.9 - 1e-8);
    assert.ok(left.position.distanceTo(starts[0]) <= 1.05);
    assert.ok(right.position.distanceTo(starts[1]) <= 1.05);
  }
  assert.ok(leftTravel > 1 && rightTravel > 1);
});

test('late first frames and long tab gaps cannot teleport or replay an entire route', () => {
  const { npc, motion } = controller();
  motion.update(1e6);
  assert.deepEqual(npc.position, new Vector3(0, 0.97, 0));
  for (let i = 1; i <= 600; i++) motion.update(1e6 + i / 60);
  const previous = npc.position.clone();
  motion.update(2e6);
  assert.ok(npc.position.distanceTo(previous) <= 0.28 * 0.25 + 1e-8);
  const pose = transforms(npc),
    state = motion.getState();
  for (const invalid of [NaN, Infinity, -Infinity]) motion.update(invalid);
  assert.deepEqual(transforms(npc), pose);
  assert.deepEqual(motion.getState(), state);
  motion.update(0);
  assert.deepEqual(transforms(npc), pose);
});

test('a blocked or zero-radius clearing stays put and returned state is a detached snapshot', () => {
  for (const options of [{ radius: 0 }, { isSafe: () => false }, { heightAt: () => null }]) {
    const { npc, motion } = controller(options);
    for (let i = 0; i <= 300; i++) motion.update(i / 6);
    assert.deepEqual(npc.position, new Vector3(0, 0.97, 0));
    assert.equal(motion.getState().phase, 'idle');
  }
  const { motion } = controller();
  reachWalk(motion);
  const snapshot = motion.getState();
  snapshot.paused = true;
  snapshot.target.x = 999;
  assert.equal(motion.getState().paused, false);
  assert.notEqual(motion.getState().target.x, 999);
  for (const radius of [-1, Infinity, NaN]) assert.throws(() => controller({ radius }), RangeError);
});
