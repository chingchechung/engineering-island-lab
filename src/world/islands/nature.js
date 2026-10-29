import { Group, TorusGeometry, Vector3 } from 'three';
import { createTerrain } from '../terrain.js';
import { tree, addPond, scatterFlowers } from '../props.js';
import { ball, box, cone, cylinder, mesh } from '../primitives.js';
import { createBridge } from '../bridge.js';
import { createIslandShell, addAnimal, mound, ring } from './shared.js';

// All island-specific additions stay behind the fixed cottage/NPC clearing.
function flowerCluster(parent, x, y, z, color, size = 1) {
  const root = new Group();
  root.position.set(x, y, z);
  root.scale.setScalar(size);
  parent.add(root);
  cylinder(root, '#6b9770', [0, 0.24, 0], 0.035, 0.48, 5);
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    ball(
      root,
      color,
      [Math.cos(angle) * 0.16, 0.51, Math.sin(angle) * 0.16],
      [0.15, 0.08, 0.15],
      6,
    );
  }
  ball(root, '#f2d38d', [0, 0.55, 0], [0.11, 0.06, 0.11], 6);
  return root;
}

function garden(record) {
  const { top, landmarks, house } = record;
  // Unequal petal terraces create a stepped skyline, with flower colours grouped by bed.
  const beds = [
    [0, -1.7, 2.25, top + 0.75, '#dd9db5'],
    [2.5, -1.1, 1.48, top + 0.36, '#eac486'],
    [-1.75, -2.5, 1.35, top + 0.52, '#b9a6cc'],
  ];
  for (const [x, z, radius, height, flowerColor] of beds) {
    const terrace = createTerrain({
      radius,
      depth: 0.8,
      top: height,
      seed: Math.round(x * 11 + 32),
      stretch: 0.77,
      lobes: 5,
    });
    terrace.group.position.set(x, 0, z);
    landmarks.add(terrace.group);
    const flowers = new Group();
    flowers.position.set(x, 0, z);
    landmarks.add(flowers);
    scatterFlowers(flowers, {
      seed: Math.round(radius * 41),
      count: 26,
      radius: radius * 0.8,
      y: height + 0.08,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      flowerCluster(
        landmarks,
        x + Math.cos(angle) * radius * 0.62,
        height + 0.1,
        z + Math.sin(angle) * radius * 0.48,
        flowerColor,
        0.65,
      );
    }
  }
  for (const [x, z, colour] of [
    [-2.9, -2.2, '#dda1b3'],
    [1.4, -2.75, '#e7bac4'],
    [3.35, -1.65, '#e7c18e'],
  ]) {
    tree(landmarks, x, top + 0.18, z, 0.61, 1);
    ball(landmarks, colour, [x, top + 1.8, z], [0.67, 0.54, 0.61]);
  }
  // Rose-covered timber arbor: decorative, with no player path or collision system.
  const arbor = new Group();
  arbor.position.set(2.5, top + 0.1, -1.1);
  landmarks.add(arbor);
  for (const x of [-0.7, 0.7]) cylinder(arbor, '#b19a76', [x, 0.68, 0], 0.055, 1.36, 6);
  mesh(arbor, new TorusGeometry(0.7, 0.065, 5, 16, Math.PI), '#b19a76', [0, 1.35, 0]);
  for (const [x, y] of [
    [-0.61, 1.66],
    [-0.34, 1.96],
    [0.12, 2.04],
    [0.55, 1.78],
  ]) {
    ball(arbor, '#86a974', [x, y, 0], [0.25, 0.19, 0.17]);
    ball(arbor, '#dda1b3', [x, y + 0.05, 0.13], [0.12, 0.09, 0.07], 6);
  }
  // A little greenhouse bay and a flower box distinguish the Lecture cottage.
  box(house, '#b4c7af', [0.83, 0.72, -0.48], [0.56, 0.76, 0.65]);
  box(house, '#e6ddbd', [0.83, 1.12, -0.48], [0.66, 0.09, 0.75]);
  box(house, '#b39a76', [0.5, 0.56, 0.87], [0.65, 0.13, 0.24]);
  for (const x of [0.28, 0.5, 0.72]) flowerCluster(house, x, 0.64, 0.89, '#e4adbd', 0.32);

  const fish = addAnimal(record, 'fish', '#89beb8');
  const tail = fish.group.children.find(
    (o) => o.geometry?.type === 'ConeGeometry' && o.position.x < -0.5,
  );
  if (tail) tail.userData.animated = true;
  for (const x of [-0.15, 0.08]) box(fish.group, '#fff0d6', [x, 0.43, 0.225], [0.045, 0.31, 0.035]);
  fish.update = (seconds) => {
    const t = seconds + 2.74;
    fish.group.position.set(
      0.58 + Math.sin(t * 0.38) * 0.55,
      top + 0.78 + Math.sin(t * 1.65) * 0.17,
      0.2 + Math.cos(t * 0.38) * 0.22,
    );
    fish.group.rotation.set(0, Math.sin(t * 0.5) * 0.23, Math.sin(t * 2.2) * 0.055);
    if (tail) tail.rotation.y = Math.sin(t * 6) * 0.38;
  };
  fish.update(0);
}

function coast(record) {
  const { top, landmarks, house } = record;
  // Offset cliff stacks and a real open sea arch keep the coast from reading as a flat disc.
  for (const [x, z, width, height] of [
    [-0.65, -2.2, 0.85, 1.75],
    [2.55, -2.15, 0.95, 1.45],
    [3.45, -0.9, 0.7, 1.1],
  ]) {
    const rock = mound(
      landmarks,
      x,
      top + height * 0.63,
      z,
      [width, height, width * 0.75],
      '#96a5a4',
    );
    rock.rotation.z = -x * 0.08;
    mound(
      landmarks,
      x + 0.06,
      top + height * 1.43,
      z,
      [width * 0.68, 0.14, width * 0.58],
      '#d5d5bc',
    );
  }
  mesh(landmarks, new TorusGeometry(1.15, 0.32, 5, 15, Math.PI), '#99aaa9', [
    0.95,
    top + 0.23,
    -2.02,
  ]);
  addPond(landmarks, 2.55, top + 0.2, -0.37, 0.78);
  addPond(landmarks, -0.55, top + 0.18, -0.83, 0.48);
  for (const [x, z, scale] of [
    [-3.65, 1.0, 0.25],
    [-1.65, 2.65, 0.2],
    [0.35, 3.1, 0.22],
    [3.75, 1.0, 0.24],
    [2.8, -1.1, 0.32],
  ]) {
    ball(landmarks, '#e6d5ad', [x, top + 0.14, z], [scale, 0.12, scale * 0.85], 7);
    const shell = mesh(
      landmarks,
      new TorusGeometry(scale * 0.45, 0.035, 4, 9, Math.PI),
      '#efd6bb',
      [x, top + 0.27, z + 0.02],
    );
    shell.rotation.x = -0.4;
  }
  // A tiny cream-and-teal lighthouse is part of the coastline landmark, not another classroom.
  cylinder(landmarks, '#f2e2c3', [3.1, top + 1.0, -1.65], 0.31, 2, 12, 0.24);
  cylinder(landmarks, '#7fa9aa', [3.1, top + 1.08, -1.65], 0.29, 0.22, 12);
  cylinder(landmarks, '#ead09c', [3.1, top + 2.08, -1.65], 0.3, 0.27, 12);
  cone(landmarks, '#d28e70', [3.1, top + 2.42, -1.65], 0.43, 0.42, 12);
  for (const x of [-3.55, -0.4, 3.7]) {
    for (let i = 0; i < 3; i++) {
      const grass = cone(
        landmarks,
        '#8bab92',
        [x + i * 0.1, top + 0.25, -1.1 + Math.cos(i) * 0.15],
        0.06,
        0.45,
        4,
      );
      grass.rotation.z = (i - 1) * 0.17;
    }
  }
  // White porch braces and a copper vent make a coastal field-station cottage.
  for (const x of [-0.87, 0.87]) box(house, '#f3e6c7', [x, 0.86, 0.81], [0.06, 1.25, 0.06]);
  cylinder(house, '#b79a73', [0.6, 2.6, -0.35], 0.08, 0.25, 7);
  cone(house, '#d9b58c', [0.6, 2.77, -0.35], 0.15, 0.12, 7);

  const penguin = addAnimal(record, 'penguin', '#99bbb8');
  const feet = penguin.group.children.filter(
    (o) => o.isMesh && Math.abs(o.position.y - 0.055) < 0.001,
  );
  const wings = penguin.group.children.filter(
    (o) => o.isMesh && Math.abs(o.position.x) > 0.35 && Math.abs(o.position.y - 0.54) < 0.001,
  );
  [...feet, ...wings].forEach((part) => {
    part.userData.animated = true;
  });
  penguin.update = (seconds) => {
    const t = seconds + 4.11,
      step = t * 3.6;
    penguin.group.position.set(
      0.55 + Math.sin(t * 0.37) * 0.56,
      top + 0.18 + Math.abs(Math.sin(step)) * 0.055,
      0.34 + Math.cos(t * 0.37) * 0.24,
    );
    penguin.group.rotation.set(0, Math.sin(t * 0.37) * 0.4, Math.sin(step) * 0.085);
    feet.forEach((foot, i) => {
      foot.position.z = 0.15 + Math.sin(step + i * Math.PI) * 0.075;
    });
    wings.forEach((wing, i) => {
      wing.rotation.z = (i ? 1 : -1) * (0.36 + Math.sin(step) * 0.07);
    });
  };
  penguin.update(0);
}

function lake(record) {
  const { top, landmarks, house } = record;
  // The lake is inset far enough to leave both the cottage apron and animal clearing dry.
  const water = cylinder(landmarks, '#80bfca', [1.1, top + 0.18, -1.53], 2.12, 0.07, 40);
  water.scale.z = 0.7;
  const shore = ring(landmarks, '#d5d5ac', 1.1, top + 0.18, -1.53, 2.12, 0.1);
  shore.scale.y = 0.7;
  const bridge = createBridge(
    new Vector3(-1.05, top + 0.3, -1.75),
    new Vector3(3.35, top + 0.3, -1.75),
  );
  landmarks.add(bridge.group);
  for (const [x, z] of [
    [-1.05, -1.75],
    [3.35, -1.75],
  ])
    mound(landmarks, x, top + 0.11, z, [0.47, 0.17, 0.62], '#c7c3a5');
  for (const [x, z, radius] of [
    [-0.8, -3.0, 1],
    [2.3, -3.0, 1.13],
    [3.8, -0.75, 0.7],
  ])
    mound(landmarks, x, top + 0.1, z, [radius, radius * 0.62, radius * 0.73], '#8fb77e');
  // Compact willow crowns: large silhouette, a few hanging leaves, no costly foliage particles.
  for (const [x, z, size] of [
    [-0.8, -3.0, 0.75],
    [2.3, -3.0, 0.82],
  ]) {
    tree(landmarks, x, top + 0.45, z, size, 1);
    for (const side of [-1, 1]) {
      const leaf = ball(
        landmarks,
        '#88b58a',
        [x + side * size * 0.55, top + 1.35, z + 0.05],
        [0.18, 0.48, 0.18],
        7,
      );
      leaf.rotation.z = -side * 0.2;
    }
  }
  for (const [x, z] of [
    [0.4, -2.25],
    [1.55, -2.48],
    [2.25, -2.0],
  ]) {
    const pad = cylinder(landmarks, '#99bd8d', [x, top + 0.23, z], 0.19, 0.035, 8);
    pad.scale.z = 0.75;
    flowerCluster(landmarks, x, top + 0.24, z, '#e5b4c6', 0.36);
  }
  const ripple = ring(landmarks, '#c4e6d9', 1.0, top + 0.235, -1.53, 0.43, 0.025);
  ripple.userData.animated = true;
  record.animate.push((seconds) => {
    const scale = 1 + Math.sin(seconds * 0.85 + 0.7) * 0.08;
    ripple.scale.set(scale, scale, 1);
  });
  // A curved little canopy and a blue flower pot distinguish the lakeside Lecture hut.
  mesh(house, new TorusGeometry(0.45, 0.075, 5, 12, Math.PI), '#75a4a0', [-0.25, 1.05, 0.89]);
  cylinder(house, '#91b8b0', [0.8, 0.3, 0.88], 0.13, 0.25, 7, 0.17);
  flowerCluster(house, 0.8, 0.44, 0.88, '#edc18f', 0.38);

  const jelly = addAnimal(record, 'jellyfish', '#b8c6dc');
  const tentacles = jelly.group.children.filter((o) => o.geometry?.type === 'TorusGeometry');
  tentacles.forEach((part) => {
    part.userData.animated = true;
  });
  jelly.update = (seconds) => {
    const t = seconds + 5.48;
    jelly.group.position.set(
      0.62 + Math.sin(t * 0.34) * 0.46,
      top + 0.68 + Math.sin(t * 1.45) * 0.2,
      0.32 + Math.cos(t * 0.34) * 0.18,
    );
    jelly.group.rotation.set(0, Math.sin(t * 0.5) * 0.2, Math.sin(t * 0.7) * 0.07);
    const pulse = 1 + Math.sin(t * 1.45) * 0.035;
    jelly.group.scale.set(pulse, 1 / pulse, pulse);
    tentacles.forEach((part, i) => {
      part.rotation.z = Math.sin(t * 1.8 + i * 0.8) * 0.12;
      part.position.y = 0.4 + Math.sin(t * 1.45 + i * 0.55) * 0.035;
    });
  };
  jelly.update(0);
}

export function createNatureIsland(preset) {
  const record = createIslandShell(preset);
  switch (preset.id) {
    case 'S02':
      garden(record);
      break;
    case 'S03':
      coast(record);
      break;
    case 'S04':
      lake(record);
      break;
    default:
      throw new Error('Nature 模組僅支援 S02–S04');
  }
  return record;
}
