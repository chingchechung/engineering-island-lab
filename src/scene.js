import {
  Scene,
  Color,
  Group,
  HemisphereLight,
  DirectionalLight,
  PlaneGeometry,
  Mesh,
  MeshStandardMaterial,
  ShadowMaterial,
  RingGeometry,
  Vector3,
  Box3,
} from 'three';
import { createTerrain } from './world/terrain.js';
import { createBridge } from './world/bridge.js';
import {
  createAcademy,
  createLecture,
  createNpc,
  tree,
  path,
  addHill,
  scatterFlowers,
  addPond,
  addWaterfall,
} from './world/props.js';
import { ball, random } from './world/primitives.js';
import { createShark, animateShark } from './world/animals.js';

export function createIslandScene(config, fixture = null) {
  const scene = new Scene();
  scene.background = new Color('#d5e9df');
  const islands = new Group();
  islands.name = 'islands';
  scene.add(islands);
  const pickables = [],
    labels = [],
    animated = [];
  const register = (object, action) => {
    object.traverse((child) => {
      if (child.isMesh) {
        child.userData.action = action;
        pickables.push(child);
      }
    });
  };
  const label = (parent, id, text, position, action, kind = '') => {
    const anchor = new Group();
    anchor.position.set(...position);
    parent.add(anchor);
    labels.push({ anchor, id, text, action, kind });
  };

  const academy = new Group();
  academy.name = 'academy-island';
  academy.position.set(-7.2, 0, -0.8);
  islands.add(academy);
  const mainTerrain = createTerrain({ radius: 5.8, depth: 3.5, seed: 6, stretch: 0.85 });
  academy.add(mainTerrain.group);
  register(mainTerrain.group, { type: 'island', id: 'academy' });
  addHill(academy, -0.6, -1.3, 3.3, 1.9, 4);
  const campus = createAcademy();
  campus.position.set(-0.55, 1.95, -1.25);
  academy.add(campus);
  register(campus, { type: 'island', id: 'academy' });
  path(
    academy,
    [
      [-0.5, 1.2],
      [-0.5, 1.7],
      [-0.8, 2.2],
      [-1.3, 2.6],
      [-2, 2.9],
      [-2.7, 2.7],
    ],
    1.01,
    0.43,
  );
  addPond(academy, 2.35, 1.01, 2.0, 1.2);
  for (let i = 0; i < 5; i++)
    ball(academy, '#79c7c2', [2.35 + i * 0.085, 1.01, 2.4 + i * 0.31], [0.4, 0.04, 0.35]);
  addWaterfall(academy, 2.7, 3.8, 0.96, -2.4, 0.9);
  for (const [i, point] of [
    [-3.8, 0.2],
    [-3.7, -2.4],
    [3.7, -1.5],
    [4, 0.3],
    [-2.5, 1.1],
    [0.8, -3.8],
  ].entries()) {
    tree(academy, point[0], 0.93, point[1], 0.65 + (i % 2) * 0.15, i);
  }
  scatterFlowers(academy, {
    seed: 22,
    count: 65,
    radius: 4.6,
    exclude: (x, z) => (Math.abs(x) < 2.7 && z < 1.4) || (x > 1 && z > 1),
  });
  label(
    academy,
    'academy',
    config.courseTitle,
    [0, 9.7, -1.3],
    { type: 'island', id: 'academy' },
    'academy',
  );

  const forest = new Group();
  forest.name = 'S01-island';
  forest.position.set(7.2, 0, 1.2);
  islands.add(forest);
  const forestTerrain = createTerrain({ radius: 5.15, depth: 3.3, seed: 12, stretch: 0.9 });
  forest.add(forestTerrain.group);
  register(forestTerrain.group, { type: 'island', id: 'S01' });
  addHill(forest, 1.45, -2.2, 2.7, 1.65, 18);
  for (const [i, point] of [
    [-3.5, -1.7],
    [-2.2, -3],
    [-0.7, -2.9],
    [0.9, -2.2],
    [2.2, -2.2],
    [3.3, -1.1],
    [3.7, -0.25],
  ].entries()) {
    tree(forest, point[0], i >= 3 && i < 5 ? 1.7 : 0.96, point[1], i === 4 ? 1.08 : 0.8, i);
  }
  addPond(forest, 3.0, 1.0, 0.3, 0.78);
  for (let i = 0; i < 5; i++)
    ball(forest, '#79c7c2', [3.2 + i * 0.25, 1.0, 0.6 + i * 0.23], [0.32, 0.04, 0.32]);
  addWaterfall(forest, 4.25, 1.55, 0.88, -2.35, 0.65);
  const lecture = createLecture();
  lecture.position.set(-2.25, 0.96, -0.25);
  lecture.rotation.y = 0.1;
  forest.add(lecture);
  const contentEnabled = Boolean(fixture);
  if (contentEnabled) register(lecture, { type: 'lecture', id: 'S01' });
  label(
    lecture,
    'lecture',
    '▶ Lecture',
    [0, 2.8, 0.4],
    contentEnabled ? { type: 'lecture', id: 'S01' } : null,
    'lecture',
  );
  path(
    forest,
    [
      [-2.2, 1.3],
      [-1.8, 1.6],
      [-1.2, 1.8],
      [-0.5, 1.9],
      [0.2, 2],
      [0.8, 2.1],
      [1.4, 2],
    ],
    1.01,
    0.32,
  );
  scatterFlowers(forest, {
    seed: 39,
    count: 100,
    radius: 4.5,
    exclude: (x, z) => (x < -1.2 && z < 1.1) || (x > -1 && x < 1.7 && z < 2.2 && z > -0.8),
  });
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4;
    ball(
      forest,
      i % 2 ? '#aaa891' : '#b7b29a',
      [Math.cos(a) * 4.4, 0.91, Math.sin(a) * 3.8],
      [0.34, 0.25, 0.28],
    );
  }
  const npcs = [];
  if (fixture && config.assignmentMode === 'quiz') {
    for (const question of fixture.questions) {
      const npc = createNpc(question);
      npc.position.set(question.position[0], 0.97, question.position[1]);
      forest.add(npc);
      npcs.push(npc);
      const action = { type: 'npc', id: question.id };
      register(npc, action);
      label(npc, question.id, question.id, [0, 2.0, 0], action, 'question');
      label(npc, `${question.id}-badge`, question.id, [0, 0.68, 0.28], null, 'badge');
    }
  }
  label(
    forest,
    'S01',
    'S01 · 森林入門島',
    [0.9, 5.6, -1.6],
    { type: 'island', id: 'S01' },
    contentEnabled ? 'unit' : 'locked',
  );
  const shark = createShark();
  forest.add(shark);
  animated.push(shark);
  animateShark(shark, 0);

  // Keep the crossing in the gap, away from the academy, cottage and NPC clearing.
  const { group: bridge } = createBridge(
    new Vector3(-2.1, 1.02, -0.3),
    new Vector3(2.9, 1.02, 1.25),
  );
  scene.add(bridge);

  const sea = new Mesh(
    new PlaneGeometry(200, 200),
    new ShadowMaterial({ color: '#4e7665', opacity: 0.23 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -2.55;
  sea.receiveShadow = true;
  scene.add(sea);
  for (const island of [academy, forest]) {
    for (let i = 0; i < 3; i++) {
      const ripple = new Mesh(
        new RingGeometry(5.7 + i * 0.65, 5.73 + i * 0.65, 80),
        new MeshStandardMaterial({
          color: '#e6f2df',
          transparent: true,
          opacity: 0.4 - i * 0.09,
          depthWrite: false,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.scale.y = 0.78;
      ripple.position.set(island.position.x, -2.52 + i * 0.002, island.position.z);
      scene.add(ripple);
    }
  }
  const rng = random(77);
  for (let i = 0; i < 45; i++) {
    const x = (rng() - 0.5) * 60,
      z = (rng() - 0.5) * 32;
    const foam = ball(scene, '#e2eee0', [x, -2.52, z], [0.15 + rng() * 0.5, 0.012, 0.04], 6);
    foam.castShadow = false;
  }
  scene.add(new HemisphereLight('#fff6db', '#759b9b', 1.8));
  const sun = new DirectionalLight('#fff0d1', 2.4);
  sun.position.set(-12, 25, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -23;
  sun.shadow.camera.right = 23;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.far = 75;
  sun.shadow.normalBias = 0.07;
  sun.shadow.bias = -0.00015;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.updateMatrixWorld(true);
  // Include label anchors in framing so titles remain inside the canvas.
  const bounds = new Box3().setFromObject(islands);
  labels
    .filter((item) => ['academy', 'S01'].includes(item.id))
    .forEach((item) => bounds.expandByPoint(item.anchor.getWorldPosition(new Vector3())));
  return {
    scene,
    islands,
    academy,
    forest,
    bridge,
    npcs,
    shark,
    pickables,
    labels,
    bounds,
    update(seconds) {
      animateShark(shark, seconds);
    },
    focusBounds(id) {
      const group = id === 'academy' ? academy : forest;
      const box = new Box3().setFromObject(group);
      labels
        .filter((item) => item.id === id)
        .forEach((item) => box.expandByPoint(item.anchor.getWorldPosition(new Vector3())));
      return box;
    },
  };
}
