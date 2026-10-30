import assert from 'node:assert/strict';
import test from 'node:test';
import { createIslandScene } from '../src/scene.js';
import { createDayNight, DAY_NIGHT_SECONDS } from '../src/world/day-night.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';
import { Box3, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { CameraRig, ORBIT_SPEED } from '../src/camera.js';

function setup(totalUnits = 15, assignmentMode = 'quiz') {
  const world = createIslandScene(
    { courseTitle: '數位電子學', totalUnits, assignmentMode },
    demoFixture,
    { manifest: createDemoManifest(totalUnits, Math.min(totalUnits, 4)) },
  );
  world.optimize();
  return { world, lighting: createDayNight(world) };
}
function finish({ world, lighting }) {
  lighting.dispose();
  world.dispose();
}

test('sea covers desktop and portrait corner rays throughout low-elevation orbit and maximum zoom-out', () => {
  const context = setup(),
    { world } = context;
  const surface = world.seaLife.root.getObjectByName('moving-mint-sea');
  const waterBounds = new Box3().setFromObject(surface);
  const plane = new Plane(new Vector3(0, 1, 0), -surface.position.y);
  const ray = new Raycaster();
  for (const aspect of [1366 / 638, 390 / 714]) {
    const rig = new CameraRig(world.bounds, aspect, world.framingPoints);
    for (let i = 0; i < 20; i++) rig.zoom(150);
    for (const angle of [25, 42, 70]) {
      rig.orbit(0, ((angle * Math.PI) / 180 - rig.elevationGoal) / ORBIT_SPEED);
      for (let turn = 0; turn < 4; turn++) {
        rig.orbit(-Math.PI / 2 / ORBIT_SPEED, 0);
        rig.update(3);
        for (const x of [-1, 1])
          for (const y of [-1, 1]) {
            ray.setFromCamera(new Vector2(x, y), rig.camera);
            const p = ray.ray.intersectPlane(plane, new Vector3());
            assert.ok(
              p &&
                p.x >= waterBounds.min.x &&
                p.x <= waterBounds.max.x &&
                p.z >= waterBounds.min.z &&
                p.z <= waterBounds.max.z,
              'no hard sea-plane edge enters the viewport',
            );
            const clip = p.clone().project(rig.camera);
            assert.ok(
              Math.abs(clip.z) < 1,
              'sea corner also remains between camera near/far planes',
            );
          }
      }
    }
  }
  finish(context);
});

test('day/night transitions are reversible, smooth and retain exact daylight without mutating original materials', () => {
  const context = setup(1),
    { world, lighting } = context;
  const hemisphere = world.scene.children.find((o) => o.isHemisphereLight),
    sun = world.scene.children.find((o) => o.isDirectionalLight);
  const original = {
    background: world.scene.background.clone(),
    sky: hemisphere.color.clone(),
    ground: hemisphere.groundColor.clone(),
    ambient: hemisphere.intensity,
    sun: sun.color.clone(),
    sunlight: sun.intensity,
  };
  const materials = new Map();
  world.islands.traverse((o) => {
    if (o.isMesh) materials.set(o.material, o.material.clone());
  });
  assert.equal(lighting.root.visible, false);
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS / 2);
  assert.equal(lighting.snapshot().blend, 0.5);
  lighting.update(DAY_NIGHT_SECONDS / 2);
  assert.equal(lighting.snapshot().blend, 1);
  assert.notEqual(world.scene.background.getHex(), original.background.getHex());
  assert.ok(
    hemisphere.intensity > 0.5 && sun.intensity > 0.3,
    'moon and sky retain readable models',
  );
  lighting.setMode('day');
  lighting.update(DAY_NIGHT_SECONDS);
  assert.equal(lighting.snapshot().blend, 0);
  assert.equal(lighting.root.visible, false);
  assert.deepEqual(world.scene.background, original.background);
  assert.deepEqual(hemisphere.color, original.sky);
  assert.deepEqual(hemisphere.groundColor, original.ground);
  assert.equal(hemisphere.intensity, original.ambient);
  assert.deepEqual(sun.color, original.sun);
  assert.equal(sun.intensity, original.sunlight);
  for (const [source, copy] of materials) {
    if (source.color) assert.deepEqual(source.color, copy.color);
    if (source.emissive) assert.deepEqual(source.emissive, copy.emissive);
    assert.equal(source.emissiveIntensity, copy.emissiveIntensity);
    copy.dispose();
  }
  finish(context);
});

test('15 cottages, academy and all six trunk bridges have independent fixtures in six instanced batches', () => {
  const context = setup(),
    { lighting } = context;
  const state = lighting.snapshot();
  assert.equal(Object.keys(state.cottages).length, 15);
  assert.ok(
    Object.values(state.cottages).every((cottage) => cottage.windows >= 1 && cottage.lamps >= 1),
  );
  assert.ok(state.academyWindows >= 5 && state.academyEntrance >= 2);
  assert.equal(state.bridges.filter((bridge) => bridge.main).length, 6);
  assert.ok(state.bridges.every((bridge) => bridge.lamps >= 2));
  assert.equal(state.themes.length, 15);
  assert.equal(new Set(state.themes.map((theme) => theme.kind)).size, 15);
  assert.ok(state.themes.every((theme) => theme.fixtures > 0));
  assert.equal(state.batches, 6);
  assert.ok(lighting.root.children.filter((o) => o.isMesh).every((o) => o.isInstancedMesh));
  assert.ok(lighting.root.getObjectByName('night-window-panes').material.emissiveIntensity > 1);
  finish(context);
});

test('fixtures leave framing, picking, locked status, geometry and all background life independent', () => {
  const context = setup(),
    { world, lighting } = context;
  const bounds = world.bounds.clone(),
    framing = world.framingPoints.map((p) => p.toArray()),
    original = world.pickables.slice(),
    gates = [...world.records].map(([id, record]) => [id, record.unlocked, Boolean(record.gate)]);
  const before = {
    shark: world.shark.position.clone(),
    sea: world.seaLife.snapshot(),
    visitors: world.visitors.snapshot(),
  };
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS);
  world.update(2, 'S01', 100, world.forest.position);
  assert.deepEqual(world.bounds, bounds);
  assert.deepEqual(
    world.framingPoints.map((p) => p.toArray()),
    framing,
  );
  assert.deepEqual(world.pickables, original);
  assert.deepEqual(
    [...world.records].map(([id, record]) => [id, record.unlocked, Boolean(record.gate)]),
    gates,
  );
  lighting.root.traverse((o) => {
    assert.equal(o.userData.action, undefined);
    assert.ok(!world.pickables.includes(o));
  });
  assert.notDeepEqual(world.shark.position, before.shark);
  assert.notDeepEqual(world.seaLife.snapshot().whales[0].position, before.sea.whales[0].position);
  assert.equal(world.animals.length, 45);
  assert.equal(world.seaLife.whales.length, 4);
  assert.equal(world.visitors.snapshot().length, before.visitors.length);
  finish(context);
});

test('only one unshadowed porch light is active in focused night views, with none in overview or day', () => {
  const context = setup(),
    { lighting } = context;
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS);
  assert.equal(lighting.snapshot().actualLocalLights, 0);
  lighting.update(0, { view: 'academy' });
  assert.equal(lighting.snapshot().actualLocalLights, 1);
  const light = lighting.root.getObjectByName('focused-porch-light');
  const academyPosition = light.position.clone();
  lighting.update(0, { view: 'S15' });
  assert.equal(lighting.snapshot().actualLocalLights, 1);
  assert.ok(light.position.distanceTo(academyPosition) > 10);
  assert.equal(light.castShadow, false);
  assert.equal(lighting.snapshot().localShadowLights, 0);
  lighting.update(0, { view: 'overview' });
  assert.equal(lighting.snapshot().actualLocalLights, 0);
  lighting.setMode('day');
  lighting.update(DAY_NIGHT_SECONDS, { view: 'S01' });
  assert.equal(lighting.snapshot().actualLocalLights, 0);
  finish(context);
});

test('sea night color preserves the same absolute whale route, phase and spouting schedule', () => {
  const context = setup(1),
    { world, lighting } = context;
  world.seaLife.update(9.5);
  const original = world.seaLife.snapshot(),
    originalColor = lighting.snapshot().seaColor;
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS);
  world.seaLife.update(9.5);
  const night = world.seaLife.snapshot();
  assert.deepEqual(night.whales, original.whales);
  assert.equal(night.seaTime, original.seaTime);
  assert.equal(lighting.snapshot().blend, 1);
  assert.equal(lighting.snapshot().seaColor, '#264e67');
  world.seaLife.update(10.5);
  assert.notEqual(world.seaLife.snapshot().seaTime, night.seaTime);
  lighting.setMode('day');
  lighting.update(DAY_NIGHT_SECONDS);
  assert.equal(lighting.snapshot().seaColor, originalColor);
  assert.equal(lighting.snapshot().blend, 0);
  finish(context);
});

test('video-only retains the same cottage and environment lights without generating any NPC', () => {
  const context = setup(15, 'video-only'),
    { world, lighting } = context;
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS);
  assert.equal(world.npcs.length, 0);
  assert.ok(!world.labels.some((label) => label.kind === 'question'));
  assert.equal(Object.keys(lighting.snapshot().cottages).length, 15);
  assert.equal(world.animals.length, 45);
  assert.ok(world.visitors.snapshot().length > 0);
  finish(context);
});

test('fireflies move only in the decorative layer and reverse mid-transition without a discontinuity', () => {
  const context = setup(1),
    { lighting } = context;
  lighting.setMode('night');
  lighting.update(0.5);
  const before = lighting.snapshot().blend;
  lighting.setMode('day');
  lighting.update(0);
  assert.equal(lighting.snapshot().blend, before);
  lighting.setMode('night');
  lighting.update(1);
  const core = lighting.root.getObjectByName('night-lantern-cores');
  const a = core.instanceMatrix.array.slice();
  lighting.update(1);
  assert.notDeepEqual(core.instanceMatrix.array, a);
  assert.throws(() => lighting.setMode('dusk'));
  assert.throws(() => lighting.update(NaN));
  assert.throws(() => lighting.update(-1));
  finish(context);
});

test('owned fixture GPU resources dispose exactly once and are detached before world disposal', () => {
  const context = setup(1),
    { world, lighting } = context;
  const counts = new Map(),
    resources = new Set();
  lighting.root.traverse((o) => {
    if (o.geometry) resources.add(o.geometry);
    if (o.material) resources.add(o.material);
    if (o.isInstancedMesh) resources.add(o);
  });
  resources.forEach((resource) => {
    counts.set(resource, 0);
    resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  });
  lighting.setMode('night');
  lighting.update(DAY_NIGHT_SECONDS);
  lighting.dispose();
  lighting.dispose();
  assert.equal(lighting.root.parent, null);
  assert.equal(lighting.snapshot().blend, 0);
  world.dispose();
  assert.ok([...counts.values()].every((count) => count === 1));
});
