import { Group, LatheGeometry, TorusGeometry, Vector2 } from 'three';
import { createTerrain } from '../terrain.js';
import { createLecture, tree, addPond, addWaterfall, scatterFlowers } from '../props.js';
import { ball, box, cone, cylinder, mesh, material } from '../primitives.js';
import { createBridge } from '../bridge.js';
import { Vector3 } from 'three';

import { createCreature, animateCreature } from '../creatures.js';
export function crystal(parent, x, y, z, color, size = 1) {
  const group = new Group();
  group.position.set(x, y, z);
  group.scale.setScalar(size);
  parent.add(group);
  cylinder(group, color, [0, 0.5, 0], 0.25, 1.0, 5, 0.18);
  cone(group, color, [0, 1.2, 0], 0.18, 0.4, 5);
  return group;
}
export function mound(parent, x, y, z, scale, color) {
  return ball(parent, color, [x, y, z], scale, 12);
}
export function coral(parent, x, y, z, color, size = 1) {
  const root = new Group();
  root.position.set(x, y, z);
  root.scale.setScalar(size);
  parent.add(root);
  cylinder(root, color, [0, 0.65, 0], 0.09, 1.3, 7, 0.065);
  for (const side of [-1, 1]) {
    const branch = cylinder(root, color, [side * 0.28, 0.87, 0], 0.07, 0.7, 6, 0.05);
    branch.rotation.z = -side * 0.8;
    ball(root, color, [side * 0.55, 1.12, 0], [0.13, 0.15, 0.12]);
    cylinder(root, color, [side * 0.5, 1.35, 0], 0.06, 0.5, 6, 0.04);
  }
  ball(root, color, [0, 1.38, 0], [0.13, 0.15, 0.12]);
}
export function cactus(parent, x, y, z, size = 1) {
  coral(parent, x, y, z, '#83ac87', size);
}
export function ring(parent, color, x, y, z, radius, thickness = 0.12) {
  const result = mesh(parent, new TorusGeometry(radius, thickness, 6, 32), color, [x, y, z]);
  result.rotation.x = Math.PI / 2;
  return result;
}

export function createThemedLecture(preset) {
  const house = createLecture();
  const [wall, roof] = preset.house;
  house.traverse((o) => {
    if (!o.isMesh) return;
    const color = `#${o.material.color.getHexString()}`;
    if (color === '#f5e4be') o.material = material(wall);
    if (color === '#da8268') o.material = material(roof);
    if (color === '#e79a78') o.material = material(preset.id === 'S06' ? '#fff0d9' : roof);
  });
  if (preset.id === 'S05') {
    box(house, '#7d7b83', [0, 0.2, 0], [2.2, 0.4, 1.7]);
    box(house, '#686775', [0.7, 1.9, -0.5], [0.42, 1.2, 0.45]);
    ball(house, '#e7a166', [0.7, 2.55, -0.5], [0.23, 0.1, 0.23]);
  } else if (preset.id === 'S06') {
    const donut = mesh(house, new TorusGeometry(0.55, 0.19, 7, 20), '#f0b9ce', [0, 2.25, 0.4]);
    donut.rotation.x = 0.12;
    for (const x of [-0.8, 0.8]) ball(house, '#fff0da', [x, 1.7, 0.2], [0.33, 0.19, 0.7]);
  } else if (preset.id === 'S07') {
    for (const x of [-0.75, 0, 0.75]) crystal(house, x, 1.7, -0.3, '#a9d4de', 0.6);
    box(house, '#f5f6ec', [0, 1.55, 0.6], [2.4, 0.14, 0.4]);
  } else if (preset.id === 'S11') {
    for (let i = 0; i < 5; i++)
      ball(house, '#f4f3e9', [-0.9 + i * 0.45, 0.05, 0.3], [0.4, 0.2, 0.8]);
  } else if (preset.id === 'S14') {
    for (const x of [-0.8, 0.8]) crystal(house, x, 1.5, 0, '#beb4d3', 0.65);
  } else if (preset.id === 'S15') {
    for (let i = 0; i < 7; i++) {
      const angle = (i - 3) * 0.24;
      const shell = box(
        house,
        i % 2 ? '#f2cabd' : '#e9b0b8',
        [Math.sin(angle) * 0.75, 2.1 + Math.cos(angle) * 0.4, -0.2],
        [0.12, 1.2, 0.15],
      );
      shell.rotation.z = -angle;
    }
  }
  return house;
}

export function createIslandShell(preset) {
  const root = new Group();
  root.name = `${preset.id}-island`;
  const top = preset.top ?? 0.8;
  const built = createTerrain({
    radius: preset.radius,
    depth: preset.depth,
    seed: Number(preset.id.slice(1)) * 7 + 20,
    top,
    stretch: preset.stretch,
    lobes: preset.lobes,
    palette: preset.palette,
  });
  root.add(built.group);
  const landmarks = new Group();
  landmarks.name = `landmark-${preset.id}`;
  root.add(landmarks);
  const house = createThemedLecture(preset);
  house.position.set(-2.25, top + 0.16, -0.25);
  root.add(house);
  scatterFlowers(root, {
    seed: Number(preset.id.slice(1)) * 13,
    count: ['S05', 'S07', 'S10'].includes(preset.id) ? 12 : 45,
    radius: 4.4,
    y: top + 0.17,
    exclude: (x, z) => z < 1.1 || Math.abs(x) < 1.8,
  });
  return { root, terrain: built.body, house, top, landmarks, animate: [], creatures: [] };
}
export function addAnimal(record, kind, color, index = 0) {
  const group = createCreature(kind, color);
  const phase = Number(record.root.name.slice(1, 3)) * 1.37 + index * 2.5;
  const motion = {
    group,
    kind,
    update(seconds) {
      animateCreature(group, kind, seconds, phase, record.top + 0.3);
    },
  };
  record.root.add(group);
  record.creatures.push(motion);
  motion.update(0);
  return motion;
}
