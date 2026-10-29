import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Raycaster, Vector2, Vector3 } from 'three';
import { createIslandScene } from '../src/scene.js';
import { createTerrain } from '../src/world/terrain.js';
import { sharkPose } from '../src/world/animals.js';
import { CameraRig, clampZoom, wheelZoom, MIN_ZOOM, MAX_ZOOM } from '../src/camera.js';
import { PointerGesture, DRAG_THRESHOLD } from '../src/interaction.js';
import { demoFixture } from '../src/demo/fixture.js';

const config = { courseTitle: '數位電子學', totalUnits: 12, assignmentMode: 'quiz' };
test('one lit world contains two islands, four labelled NPCs and a lecture target', () => {
  const world = createIslandScene(config, demoFixture);
  assert.ok(world.scene.isScene);
  assert.equal(world.islands.children.length, 2);
  assert.equal(world.npcs.length, 4);
  assert.deepEqual(
    world.labels.filter((l) => l.kind === 'question').map((l) => l.text),
    ['Q01', 'Q02', 'Q03', 'Q04'],
  );
  assert.equal(world.labels.find((l) => l.id === 'academy').text, config.courseTitle);
  assert.ok(world.pickables.some((o) => o.userData.action.type === 'lecture'));
  assert.ok(world.scene.children.some((o) => o.isDirectionalLight));
});
test('video-only builds no NPC, Q label, or NPC pick target; landscape and shark persist', () => {
  const world = createIslandScene({ ...config, assignmentMode: 'video-only' }, demoFixture);
  assert.equal(world.npcs.length, 0);
  assert.ok(!world.labels.some((l) => l.id.startsWith('Q')));
  assert.ok(!world.pickables.some((o) => o.userData.action.type === 'npc'));
  assert.ok(world.pickables.some((o) => o.userData.action.type === 'lecture'));
  assert.ok(world.shark.parent);
  assert.equal(world.islands.children.length, 2);
});
test('without Demo fixture no curriculum targets or question labels are generated', () => {
  const world = createIslandScene(config);
  assert.equal(world.npcs.length, 0);
  assert.ok(!world.pickables.some((o) => ['npc', 'lecture'].includes(o.userData.action.type)));
  assert.ok(world.labels.some((l) => l.kind === 'locked'));
});
test('decorative shark and every descendant are absent from the entire pick registry', () => {
  const world = createIslandScene(config, demoFixture);
  world.shark.traverse((o) => {
    assert.ok(!world.pickables.includes(o));
    assert.equal(o.userData.action, undefined);
  });
  const a = world.shark.position.clone();
  world.update(0.5);
  assert.ok(a.distanceTo(world.shark.position) > 0.1);
  assert.deepEqual(sharkPose(0.5), sharkPose(0.5));
  assert.ok(sharkPose(0.5).y > 1.13);
});
test('terrain has deterministic irregular coastline and substantial sloping depth', () => {
  const a = createTerrain({ seed: 12 }),
    b = createTerrain({ seed: 12 });
  assert.deepEqual(a.group.userData.outline, b.group.userData.outline);
  const radii = a.group.userData.outline.map((p) => p.r);
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.2);
  a.body.geometry.computeBoundingBox();
  const bounds = a.body.geometry.boundingBox;
  assert.ok(bounds.max.y - bounds.min.y > 3);
  const position = a.body.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++)
    assert.ok(
      Number.isFinite(position.getX(i)) &&
        Number.isFinite(position.getY(i)) &&
        Number.isFinite(position.getZ(i)),
    );
});
for (const aspect of [1366 / 547, 390 / 494, 1920 / 875]) {
  test(`orthographic overview fits BOTH islands including title anchors at aspect ${aspect.toFixed(2)}`, () => {
    const world = createIslandScene(config, demoFixture),
      rig = new CameraRig(world.bounds, aspect);
    assert.ok(rig.camera.isOrthographicCamera);
    for (const x of [world.bounds.min.x, world.bounds.max.x])
      for (const y of [world.bounds.min.y, world.bounds.max.y])
        for (const z of [world.bounds.min.z, world.bounds.max.z]) {
          const p = new Vector3(x, y, z).project(rig.camera);
          assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
        }
  });
}
test('focus, continuous zoom, pan and overview operate on the same camera', () => {
  const world = createIslandScene(config, demoFixture),
    rig = new CameraRig(world.bounds, 2);
  const camera = rig.camera,
    original = rig.target.clone();
  rig.focus('S01', world.focusBounds('S01'));
  rig.update(2);
  assert.equal(rig.view, 'S01');
  assert.ok(rig.target.x > original.x + 2);
  assert.ok(rig.camera.zoom > 1.25);
  const zoom = rig.zoomGoal;
  rig.zoom(-100);
  assert.ok(rig.zoomGoal > zoom);
  rig.pan(new Vector3(1, 0, 1));
  rig.update(2);
  assert.ok(rig.target.x > 7);
  rig.reset();
  rig.update(2);
  assert.equal(rig.view, 'overview');
  assert.ok(rig.target.distanceTo(original) < 0.001);
  assert.equal(rig.camera, camera);
});
test('zoom clamps extreme inputs and wheel increments remain continuous', () => {
  assert.equal(clampZoom(1000), MAX_ZOOM);
  assert.equal(clampZoom(-1000), MIN_ZOOM);
  assert.ok(wheelZoom(1, -10) > 1 && wheelZoom(1, -10) < 1.1);
  let zoom = 1;
  for (let i = 0; i < 100; i++) zoom = wheelZoom(zoom, -100);
  assert.equal(zoom, MAX_ZOOM);
  for (let i = 0; i < 100; i++) zoom = wheelZoom(zoom, 100);
  assert.equal(zoom, MIN_ZOOM);
});
test('click/drag tracks maximum excursion, exact threshold, cancellation and orphan releases', () => {
  const gesture = new PointerGesture();
  assert.equal(gesture.end(0, 0), false);
  gesture.begin(100, 100);
  gesture.move(103, 101);
  assert.equal(gesture.end(103, 101), true);
  gesture.begin(0, 0);
  gesture.move(DRAG_THRESHOLD, 0);
  assert.equal(gesture.dragging, true);
  assert.equal(gesture.end(0, 0), false);
  gesture.begin(0, 0);
  gesture.move(80, 0);
  gesture.move(0, 0);
  assert.equal(gesture.end(0, 0), false);
  gesture.begin(0, 0);
  gesture.cancel();
  assert.equal(gesture.end(0, 0), false);
});

test('scenic bridge lands on both banks and curves above the water inside the overview', () => {
  const world = createIslandScene(config, demoFixture);
  const bridge = world.bridge;
  world.scene.updateMatrixWorld(true);
  const banks = [world.academy, world.forest];
  const deck = bridge.getObjectByName('bridge-deck').children;
  for (const [i, plank] of [deck[0], deck.at(-1)].entries()) {
    const terrain = banks[i].getObjectByName('coast-and-cliffs');
    const ray = new Raycaster(
      plank.position.clone().add(new Vector3(0, 5, 0)),
      new Vector3(0, -1, 0),
    );
    const hit = ray.intersectObject(terrain)[0];
    assert.ok(hit, 'each bridge end overlaps solid island terrain');
    assert.ok(plank.position.y - hit.point.y > 0 && plank.position.y - hit.point.y < 0.4);
  }
  const middle = deck[Math.floor(deck.length / 2)].position;
  const straight = deck[0].position.clone().lerp(deck.at(-1).position, 0.5);
  assert.ok(middle.y - straight.y > 0.45, 'arched deck remains visibly three-dimensional');
  assert.ok(
    middle.z - straight.z > 0.25,
    'deck bends gently in plan rather than forming a straight road',
  );
  assert.ok(
    world.bounds.containsBox(new Box3().setFromObject(bridge)),
    'bridge fits existing overview bounds',
  );
});

test('bridge stays decorative in both modes and clear of the Lecture/NPC interaction areas', () => {
  for (const assignmentMode of ['quiz', 'video-only']) {
    const world = createIslandScene({ ...config, assignmentMode }, demoFixture);
    world.bridge.traverse((object) => {
      assert.ok(!world.pickables.includes(object));
      assert.equal(object.userData.action, undefined);
    });
    const bridgeBounds = new Box3().setFromObject(world.bridge);
    for (const object of [world.forest.getObjectByName('lecture-cottage'), ...world.npcs]) {
      assert.equal(bridgeBounds.intersectsBox(new Box3().setFromObject(object)), false);
    }
    assert.equal(world.npcs.length, assignmentMode === 'quiz' ? 4 : 0);
  }
});

test('bridge leaves direct camera sightlines to both island signs, Lecture and all NPCs', () => {
  const world = createIslandScene(config, demoFixture);
  const rig = new CameraRig(world.bounds, 1366 / 543);
  const targets = world.labels.map((item) => item.anchor.getWorldPosition(new Vector3()));
  for (const object of [world.forest.getObjectByName('lecture-cottage'), ...world.npcs]) {
    targets.push(new Box3().setFromObject(object).getCenter(new Vector3()));
  }
  for (const target of targets) {
    const projected = target.clone().project(rig.camera);
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2(projected.x, projected.y), rig.camera);
    ray.far = ray.ray.origin.distanceTo(target) - 0.01;
    assert.equal(
      ray.intersectObject(world.bridge, true).length,
      0,
      'bridge must not obstruct a landmark',
    );
  }
});
