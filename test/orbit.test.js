import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import {
  CameraRig,
  DEFAULT_AZIMUTH,
  DEFAULT_ELEVATION,
  MIN_ELEVATION,
  MAX_ELEVATION,
  ORBIT_SPEED,
} from '../src/camera.js';
import { attachInteraction } from '../src/interaction.js';
import { createIslandScene } from '../src/scene.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';

const box = () => new Box3(new Vector3(-6, -3, -5), new Vector3(7, 8, 5));
const close = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);

for (const count of [1, 12, 15])
  test(`${count} islands retain every framing corner through full orbit and both elevation limits`, () => {
    const world = createIslandScene(
      { courseTitle: 'Orbit validation', totalUnits: count, assignmentMode: 'quiz' },
      demoFixture,
      { manifest: createDemoManifest(count, count) },
    );
    for (const aspect of [1366 / 638, 390 / 714]) {
      const rig = new CameraRig(world.bounds, aspect, world.framingPoints);
      const pivot = rig.target.clone();
      assert.ok(rig.camera.isOrthographicCamera);
      for (const elevation of [DEFAULT_ELEVATION, MIN_ELEVATION, MAX_ELEVATION]) {
        rig.orbit(0, (elevation - rig.elevationGoal) / ORBIT_SPEED);
        for (let turn = 0; turn < 5; turn++) {
          rig.orbit(-Math.PI / 2 / ORBIT_SPEED, 0);
          // Check intermediate damped directions, not only the settled endpoint.
          for (let frame = 0; frame < 35; frame++) {
            rig.update(1 / 30);
            assert.ok(rig.camera.position.y > world.bounds.max.y);
            assert.ok(rig.camera.up.y > 0);
            for (const point of world.framingPoints) {
              const p = point.clone().project(rig.camera);
              assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
            }
          }
        }
      }
      assert.ok(rig.azimuthGoal > DEFAULT_AZIMUTH + Math.PI * 6);
      assert.ok(rig.target.equals(pivot), 'orbit does not rotate or translate the world/pivot');
      rig.orbit(0, -100000);
      rig.update(3);
      close(rig.elevation, MIN_ELEVATION);
      rig.orbit(0, 100000);
      rig.update(3);
      close(rig.elevation, MAX_ELEVATION);
    }
    world.dispose();
  });

test('focus preserves orbit direction, manual zoom survives refit, reset takes nearest standard direction', () => {
  const rig = new CameraRig(box(), 1.8);
  const camera = rig.camera;
  rig.orbit((-Math.PI * 4.4) / ORBIT_SPEED, 20);
  rig.update(3);
  const angle = rig.azimuthGoal;
  const focusA = new Box3(new Vector3(1, 0, 0), new Vector3(3, 3, 2));
  const focusB = focusA.clone().translate(new Vector3(-5, 0, -2));
  rig.focus('S01', focusA);
  rig.update(3);
  close(rig.azimuth, angle);
  const before = rig.zoomGoal;
  rig.zoom(-100);
  assert.ok(rig.zoomGoal > before);
  const factor = rig.manualZoom;
  rig.orbit(-120, -10);
  rig.update(3);
  close(rig.manualZoom, factor);
  const orbitAngle = rig.azimuthGoal;
  rig.focus('S02', focusB);
  assert.equal(rig.azimuthGoal, orbitAngle);
  assert.equal(rig.manualZoom, 1);
  rig.update(3);
  assert.ok(rig.target.distanceTo(focusB.getCenter(new Vector3())) < 1e-6);
  rig.resize(0.55);
  rig.update(3);
  assert.ok(Number.isFinite(rig.zoomGoal));
  rig.reset();
  assert.ok(Math.abs(rig.azimuthGoal - rig.azimuth) <= Math.PI);
  rig.update(3);
  close(Math.sin(rig.azimuth), Math.sin(DEFAULT_AZIMUTH));
  close(Math.cos(rig.azimuth), Math.cos(DEFAULT_AZIMUTH));
  close(rig.elevation, DEFAULT_ELEVATION);
  close(rig.camera.zoom, 1);
  assert.equal(rig.view, 'overview');
  assert.equal(rig.camera, camera);
});

test('portrait depth refit keeps every sea corner ray in front and preserves exact screen XY', () => {
  const bounds = new Box3(new Vector3(-70, -4, -50), new Vector3(70, 20, 50)),
    rig = new CameraRig(bounds, 390 / 714),
    sea = new Plane(new Vector3(0, 1, 0), 2.585),
    ray = new Raycaster();
  for (let i = 0; i < 20; i++) rig.zoom(150);
  for (const elevation of [MIN_ELEVATION, DEFAULT_ELEVATION, MAX_ELEVATION]) {
    rig.orbit(0, (elevation - rig.elevationGoal) / ORBIT_SPEED);
    for (let turn = 0; turn < 4; turn++) {
      rig.orbit(-Math.PI / 2 / ORBIT_SPEED, 0);
      for (let frame = 0; frame < 40; frame++) {
        rig.update(1 / 30);
        for (const x of [-1, 1])
          for (const y of [-1, 1]) {
            ray.setFromCamera(new Vector2(x, y), rig.camera);
            assert.ok(ray.ray.origin.y > -2.585);
            const hit = ray.ray.intersectPlane(sea, new Vector3());
            assert.ok(hit, 'every viewport ray reaches sea in front of the camera');
            const projected = hit.project(rig.camera);
            close(projected.x, x);
            close(projected.y, y);
            assert.ok(projected.z > -1 && projected.z < 1, 'sea is also before the far plane');
          }
      }
      // Compare with the former camera distance at identical target, frustum,
      // zoom and orientation. Refitting depth must not recompose the scene.
      const former = rig.camera.clone();
      former.position
        .copy(rig.target)
        .addScaledVector(rig.offset.clone().normalize(), rig.baseDistance);
      former.lookAt(rig.target);
      former.updateMatrixWorld();
      for (const point of [bounds.min, bounds.max, rig.target]) {
        const a = point.clone().project(rig.camera),
          b = point.clone().project(former);
        close(a.x, b.x);
        close(a.y, b.y);
      }
    }
  }
});

test('orbit ignores non-finite inputs and bounded ground pan keeps the camera above sea', () => {
  const rig = new CameraRig(box(), 1.8);
  rig.orbit(NaN, 2);
  rig.orbit(1, Infinity);
  close(rig.azimuthGoal, DEFAULT_AZIMUTH);
  close(rig.elevationGoal, DEFAULT_ELEVATION);
  rig.pan(new Vector3(1000, 0, -1000));
  rig.update(3);
  assert.ok(rig.goal.x <= rig.bounds.max.x + 5);
  assert.ok(rig.goal.z >= rig.bounds.min.z - 8);
  assert.ok(rig.camera.position.y > 0);
});

function interactionHarness() {
  const events = new Map(),
    captures = new Set(),
    classes = new Set(),
    actions = [],
    moves = [],
    pans = [],
    zooms = [];
  let isBlocked = false;
  const canvas = {
    clientHeight: 600,
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    addEventListener: (type, fn) => events.set(type, fn),
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => {
      captures.delete(id);
      events.get('lostpointercapture')?.({ pointerId: id });
    },
  };
  const rig = new CameraRig(box(), 800 / 600);
  rig.orbit = (dx, dy) => moves.push([dx, dy]);
  rig.pan = (delta) => pans.push(delta.clone());
  rig.zoom = (delta) => zooms.push(delta);
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
  mesh.position.copy(rig.target);
  mesh.userData.action = { type: 'npc', id: 'Q04', unitId: 'S01' };
  mesh.updateMatrixWorld();
  attachInteraction({
    canvas,
    rig,
    blocked: () => isBlocked,
    getPickables: () => [mesh],
    onAction: (action) => actions.push(action),
    onHover: () => {},
  });
  const emit = (type, values = {}) => {
    const event = {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      clientX: 400,
      clientY: 300,
      shiftKey: false,
      preventDefault() {
        this.prevented = true;
      },
      ...values,
    };
    events.get(type)?.(event);
    return event;
  };
  return { emit, actions, moves, pans, zooms, captures, classes, block: () => (isBlocked = true) };
}

test('left single click picks its exact NPC; maximum excursion prevents drag-return clicks', () => {
  const h = interactionHarness();
  h.emit('pointerdown');
  h.emit('pointerup', { clientX: 403 });
  assert.deepEqual(h.actions, [{ type: 'npc', id: 'Q04', unitId: 'S01' }]);
  h.emit('pointerdown');
  h.emit('pointermove', { clientX: 460, clientY: 320 });
  h.emit('pointermove');
  h.emit('pointerup');
  assert.equal(h.actions.length, 1);
  assert.equal(h.moves.length, 2);
  assert.equal(h.pans.length, 0);
  assert.equal(h.captures.size, 0);
  assert.equal(h.classes.size, 0);
});

test('right and Shift-left drag pan; a single touch preserves pan and never orbits', () => {
  for (const settings of [{ button: 2 }, { shiftKey: true }, { pointerType: 'touch' }]) {
    const h = interactionHarness();
    h.emit('pointerdown', settings);
    h.emit('pointermove', { ...settings, clientX: 440, clientY: 320 });
    h.emit('pointerup', { ...settings, clientX: 440, clientY: 320 });
    assert.equal(h.moves.length, 0);
    assert.equal(h.pans.length, 1);
    assert.ok(h.pans[0].length() > 0);
    assert.equal(h.pans[0].y, 0);
    assert.equal(h.actions.length, 0);
    assert.equal(h.captures.size, 0);
  }
  const h = interactionHarness();
  h.emit('pointerdown', { button: 2 });
  h.emit('pointerup', { button: 2 });
  assert.equal(h.actions.length, 0, 'stationary right click cannot activate an NPC');
});

test('multiple touches cancel the whole gesture until release, then a fresh single click works', () => {
  const h = interactionHarness();
  h.emit('pointerdown', { pointerType: 'touch' });
  h.emit('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: false });
  h.emit('pointermove', { pointerType: 'touch', clientX: 450 });
  h.emit('pointerup', { pointerType: 'touch' });
  h.emit('pointermove', { pointerType: 'touch', pointerId: 2, clientX: 450 });
  h.emit('pointerup', { pointerType: 'touch', pointerId: 2 });
  assert.equal(h.actions.length, 0);
  assert.equal(h.pans.length, 0);
  assert.equal(h.captures.size, 0);
  h.emit('pointerdown');
  h.emit('pointerup');
  assert.equal(h.actions.length, 1);
});

test('multi-touch cancellation recovers when releases happen outside the canvas', () => {
  const h = interactionHarness();
  h.emit('pointerdown', { pointerType: 'touch' });
  h.emit('pointerdown', { pointerType: 'touch', pointerId: 2, isPrimary: false });
  // The first capture was released and neither outside pointerup reaches canvas.
  assert.equal(h.captures.size, 0);
  h.emit('pointerdown', { pointerType: 'touch', pointerId: 3, isPrimary: false });
  h.emit('pointerup', { pointerType: 'touch', pointerId: 3, isPrimary: false });
  assert.equal(h.actions.length, 0, 'a remaining secondary finger cannot start a click');
  h.emit('pointerdown', { pointerType: 'touch', pointerId: 4, isPrimary: true });
  h.emit('pointerup', { pointerType: 'touch', pointerId: 4, isPrimary: true });
  assert.equal(h.actions.length, 1, 'the next genuine primary gesture is usable');
});

test('cancel, capture loss and Modal blocking suppress all camera gestures and selection', () => {
  for (const type of ['pointercancel', 'lostpointercapture']) {
    const h = interactionHarness();
    h.emit('pointerdown');
    h.emit(type);
    h.emit('pointerup');
    assert.equal(h.actions.length, 0);
    assert.equal(h.captures.size, 0);
  }
  const h = interactionHarness();
  h.emit('pointerdown');
  h.block();
  h.emit('pointermove', { clientX: 450 });
  h.emit('pointerup');
  h.emit('wheel', { deltaY: 100, deltaMode: 0 });
  h.emit('pointerdown', { button: 2 });
  h.emit('pointermove', { clientX: 450 });
  h.emit('pointerup', { button: 2 });
  assert.equal(h.moves.length + h.pans.length + h.zooms.length + h.actions.length, 0);
  assert.equal(h.captures.size, 0);
});

test('wheel pixel/line/page units remain normalized and context menu is suppressed', () => {
  const h = interactionHarness();
  for (const deltaMode of [0, 1, 2]) assert.ok(h.emit('wheel', { deltaY: 2, deltaMode }).prevented);
  assert.deepEqual(h.zooms, [2, 32, 1200]);
  assert.ok(h.emit('contextmenu').prevented);
});
