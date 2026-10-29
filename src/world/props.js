import {
  Group,
  Shape,
  ExtrudeGeometry,
  TorusGeometry,
  InstancedMesh,
  Object3D,
  SphereGeometry,
  CylinderGeometry,
} from 'three';
import { ball, box, cone, cylinder, mesh, random, material } from './primitives.js';
import { createTerrain } from './terrain.js';

export function tree(parent, x, y, z, size = 1, variant = 0) {
  const group = new Group();
  group.position.set(x, y, z);
  group.scale.setScalar(size);
  parent.add(group);
  cylinder(group, '#96715c', [0, 0.6, 0], 0.13, 1.2, 7, 0.08);
  if (variant % 3 === 0) {
    cone(group, '#397c68', [0, 1.12, 0], 0.72, 1.2, 8);
    cone(group, '#55986b', [0, 1.67, 0], 0.61, 1.1, 8);
    cone(group, '#7eb379', [0, 2.15, 0], 0.4, 0.9, 8);
  } else {
    ball(group, variant % 2 ? '#63a16b' : '#9bbb70', [0, 1.65, 0], [0.85, 0.93, 0.8]);
    ball(group, '#7eb77a', [-0.42, 1.35, 0.15], [0.6, 0.65, 0.58]);
    ball(group, '#a8c777', [0.34, 1.75, 0.12], [0.62, 0.65, 0.6]);
  }
  return group;
}

export function scatterFlowers(parent, { seed, count, radius, y = 0.97, exclude = () => false }) {
  const rng = random(seed),
    colors = ['#ffe8a4', '#fff7df', '#e99398', '#bd9cce', '#f6be64'];
  const sets = new Map(),
    stems = [];
  const push = (color, position, scale) => {
    if (!sets.has(color)) sets.set(color, []);
    sets.get(color).push({ position, scale });
  };
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2,
      r = Math.sqrt(rng()) * radius,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (exclude(x, z)) continue;
    stems.push({ position: [x, y + 0.09, z], scale: [0.018, 0.18, 0.018] });
    push(colors[i % colors.length], [x, y + 0.22, z], [0.095, 0.075, 0.095]);
    if (i % 4 === 0) push('#f6cf63', [x, y + 0.27, z], [0.04, 0.035, 0.04]);
  }
  const sphere = new SphereGeometry(1, 5, 7),
    stemGeometry = new CylinderGeometry(1, 1, 1, 4);
  const dummy = new Object3D();
  const add = (geometry, color, instances) => {
    if (!instances.length) return;
    const flowers = new InstancedMesh(geometry, material(color), instances.length);
    flowers.name = 'instanced-flowers';
    flowers.userData.detail = true;
    flowers.castShadow = true;
    instances.forEach((value, i) => {
      dummy.position.set(...value.position);
      dummy.scale.set(...value.scale);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
    });
    flowers.computeBoundingSphere();
    parent.add(flowers);
  };
  add(stemGeometry, '#62976d', stems);
  for (const [color, instances] of sets) add(sphere, color, instances);
}

export function path(parent, points, y = 1.01, width = 0.5) {
  for (const [x, z] of points) {
    const stone = cylinder(parent, '#e2d3a9', [x, y, z], width, 0.08, 9);
    stone.scale.z = 0.66;
    stone.rotation.y = x * 0.8;
  }
}

function roof(parent, x, y, z, width, height, depth, color) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  return mesh(parent, new ExtrudeGeometry(shape, { depth, bevelEnabled: false }), color, [
    x,
    y,
    z - depth / 2,
  ]);
}
function window(parent, x, y, z) {
  box(parent, '#e7c897', [x, y, z], [0.42, 0.62, 0.1]);
  box(parent, '#629a9d', [x, y + 0.02, z + 0.06], [0.29, 0.43, 0.04]);
  box(parent, '#f6e4bf', [x, y + 0.02, z + 0.09], [0.035, 0.45, 0.03]);
}
function door(parent, x, y, z, width = 0.6, height = 0.95) {
  box(parent, '#b67e5f', [x, y + height / 2, z], [width + 0.13, height + 0.15, 0.12]);
  box(parent, '#487b7a', [x, y + height / 2, z + 0.07], [width, height, 0.07]);
  ball(parent, '#f2ce75', [x + width * 0.3, y + height * 0.47, z + 0.13], [0.04, 0.04, 0.04]);
}
function flag(parent, x, y, z, color) {
  cylinder(parent, '#d7b685', [x, y, z], 0.028, 0.9, 6);
  const pennant = new Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.45, -0.12);
  pennant.lineTo(0, -0.28);
  pennant.closePath();
  mesh(parent, new ExtrudeGeometry(pennant, { depth: 0.02, bevelEnabled: false }), color, [
    x,
    y + 0.42,
    z,
  ]);
}

export function createAcademy() {
  const group = new Group();
  group.name = 'academy-building';
  box(group, '#eddfbc', [0, 1.05, 0], [3.4, 2.1, 1.8]);
  roof(group, 0, 2.05, 0, 3.85, 1.3, 2.2, '#428c91');
  roof(group, 0, 2.12, 0, 3.95, 0.13, 2.35, '#7cb4aa');
  door(group, 0, 0, 0.97, 0.75, 1.15);
  for (const x of [-1.15, 1.15]) window(group, x, 1.15, 0.96);
  for (const x of [-1.9, 1.9]) {
    cylinder(group, '#f3e4c4', [x, 1.55, -0.15], 0.58, 3.1, 12);
    cylinder(group, '#d4bf98', [x, 3.0, -0.15], 0.65, 0.16, 12);
    cone(group, '#527e9a', [x, 3.75, -0.15], 0.81, 1.5, 12);
    window(group, x, 2.35, 0.43);
    flag(group, x, 4.85, -0.15, '#e8ae65');
  }
  cylinder(group, '#ead8b5', [0, 2.2, -0.8], 0.76, 4.4, 12);
  cylinder(group, '#c6ae8a', [0, 4.3, -0.8], 0.83, 0.18, 12);
  cone(group, '#397c86', [0, 5.18, -0.8], 1.05, 1.85, 12);
  flag(group, 0, 6.5, -0.8, '#e98760');
  window(group, 0, 3.55, 0);
  // Small clock, no texture dependencies.
  const clock = cylinder(group, '#fff3cb', [0, 2.8, 0.15], 0.3, 0.07, 24);
  clock.rotation.x = Math.PI / 2;
  box(group, '#567875', [0, 2.86, 0.21], [0.035, 0.17, 0.03]);
  const hand = box(group, '#567875', [0.06, 2.8, 0.21], [0.15, 0.035, 0.03]);
  hand.rotation.z = -0.2;
  for (let i = 0; i < 4; i++)
    box(group, '#d6c7a4', [0, -0.04 - i * 0.11, 1.1 + i * 0.23], [1.3 + i * 0.18, 0.18, 0.35]);
  return group;
}

export function createLecture() {
  const group = new Group();
  group.name = 'lecture-cottage';
  box(group, '#f5e4be', [0, 0.77, 0], [1.8, 1.55, 1.4]);
  box(group, '#b58c65', [0, 0.13, 0.1], [2.0, 0.26, 1.65]);
  roof(group, 0, 1.5, 0, 2.4, 1.15, 1.9, '#da8268');
  for (let i = 0; i < 4; i++)
    box(group, '#e79a78', [0, 1.55 + i * 0.22, 0.97 - i * 0.17], [2.35 - i * 0.42, 0.06, 0.1]);
  box(group, '#e8cb9e', [0.6, 2.05, -0.35], [0.3, 0.95, 0.35]);
  door(group, -0.25, 0.22, 0.75, 0.54, 0.9);
  window(group, 0.5, 0.9, 0.74);
  cylinder(group, '#956f51', [-1, 0.85, 1.1], 0.055, 1.7, 7);
  cylinder(group, '#956f51', [1, 0.85, 1.1], 0.055, 1.7, 7);
  box(group, '#f7e7c0', [0, 1.6, 1.1], [2.4, 0.42, 0.15]);
  return group;
}

export function createNpc(question) {
  const group = new Group();
  group.name = `npc-${question.id}`;
  for (const x of [-0.14, 0.14]) {
    ball(group, '#695d60', [x, 0.11, 0.08], [0.14, 0.11, 0.23]);
    cylinder(group, '#6f7f77', [x, 0.3, 0], 0.095, 0.32, 8);
  }
  ball(group, question.color, [0, 0.65, 0], [0.38, 0.43, 0.26]);
  box(group, '#fff3cf', [0, 0.7, 0.25], [0.23, 0.28, 0.03]);
  for (const x of [-0.37, 0.37]) ball(group, '#e9bf9d', [x, 0.57, 0.01], [0.1, 0.25, 0.11]);
  ball(group, '#f1ccaa', [0, 1.17, 0.02], [0.34, 0.34, 0.31], 14);
  ball(group, '#6c5c52', [0, 1.33, -0.06], [0.35, 0.22, 0.29]);
  for (const x of [-0.12, 0.12]) {
    ball(group, '#394c50', [x, 1.18, 0.31], [0.04, 0.055, 0.025]);
    ball(group, '#e6a99d', [x * 1.55, 1.08, 0.28], [0.06, 0.035, 0.02]);
  }
  ball(group, '#ac7563', [0, 1.05, 0.325], [0.045, 0.02, 0.01]);
  cylinder(group, '#ecdaaf', [0, 1.46, 0], 0.49, 0.07, 16);
  ball(group, question.color, [0, 1.53, 0], [0.32, 0.2, 0.31]);
  box(group, '#d3af77', [0.02, 1.49, 0.3], [0.24, 0.08, 0.05]);
  return group;
}

export function addWaterfall(parent, x, z, top, bottom, width = 0.9) {
  const water = box(parent, '#79ced0', [x, (top + bottom) / 2, z], [width, top - bottom, 0.13]);
  water.castShadow = false;
  for (let i = 0; i < 5; i++) {
    const stream = box(
      parent,
      i % 2 ? '#c6efdf' : '#ace1d8',
      [x - width * 0.4 + i * width * 0.18, (top + bottom) / 2, z + 0.08],
      [width * 0.085, top - bottom, 0.04],
    );
    stream.castShadow = false;
  }
  for (let i = 0; i < 7; i++)
    ball(
      parent,
      '#dfefdc',
      [x + Math.sin(i * 7) * width * 0.65, bottom + 0.05, z + 0.2 + Math.cos(i) * 0.25],
      [0.32, 0.13, 0.27],
    );
  return water;
}

export function addPond(parent, x, y, z, radius) {
  const pond = cylinder(parent, '#6cbeb7', [x, y, z], radius, 0.07, 40);
  pond.scale.z = 0.7;
  const rim = mesh(parent, new TorusGeometry(radius, 0.1, 6, 40), '#d5d5ac', [x, y, z]);
  rim.rotation.x = Math.PI / 2;
  rim.scale.y = 0.7;
}

export function addHill(parent, x, z, radius, top, seed) {
  const { group } = createTerrain({ radius, depth: 1.3, top, seed });
  group.position.set(x, 0, z);
  parent.add(group);
  return group;
}
