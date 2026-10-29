import { Group, Shape, ExtrudeGeometry } from 'three';
import { ball, mesh } from './primitives.js';

function fin(parent, color, position, points, depth = 0.1) {
  const shape = new Shape();
  shape.moveTo(...points[0]);
  points.slice(1).forEach((p) => shape.lineTo(...p));
  shape.closePath();
  return mesh(
    parent,
    new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      bevelSegments: 1,
    }),
    color,
    position,
  );
}
export function createShark() {
  const shark = new Group();
  shark.name = 'decorative-shark';
  shark.userData.decoration = true;
  ball(shark, '#639dbb', [0, 0.35, 0], [0.82, 0.43, 0.39], 16);
  ball(shark, '#e3eedc', [0.12, 0.18, 0.04], [0.68, 0.24, 0.35], 16);
  ball(shark, '#80b4c7', [0.58, 0.34, 0], [0.37, 0.27, 0.33]);
  fin(
    shark,
    '#548aa9',
    [-0.2, 0.65, -0.05],
    [
      [-0.15, 0],
      [0.05, 0.54],
      [0.35, 0],
    ],
  );
  fin(
    shark,
    '#518ba8',
    [-0.8, 0.28, -0.05],
    [
      [0, 0],
      [-0.45, 0.43],
      [-0.3, 0],
      [-0.48, -0.3],
      [0.05, -0.1],
    ],
  );
  const pectoral = fin(
    shark,
    '#548eab',
    [0, 0.22, 0.22],
    [
      [0, 0],
      [-0.3, -0.18],
      [0.25, -0.12],
    ],
    0.27,
  );
  pectoral.rotation.x = 0.2;
  for (const z of [-0.27, 0.27]) {
    ball(shark, '#253f50', [0.65, 0.42, z], [0.075, 0.09, 0.05]);
    ball(shark, '#ffffff', [0.68, 0.46, z * 1.1], [0.022, 0.026, 0.016]);
  }
  ball(shark, '#dc9c9d', [0.51, 0.29, 0.33], [0.09, 0.045, 0.02]);
  fin(
    shark,
    '#425f70',
    [0.7, 0.22, 0.21],
    [
      [0, 0],
      [0.15, 0.03],
      [0.03, -0.04],
    ],
    0.015,
  );
  return shark;
}

// Time alone controls the animal. Pointer/camera state is intentionally absent.
export function sharkPose(seconds) {
  const phase = seconds * 2.8;
  const hop = Math.max(0, Math.sin(phase));
  return {
    x: 0.4 + Math.sin(seconds * 0.38) * 0.72,
    y: 1.13 + hop * 0.7,
    z: 0.35 + Math.cos(seconds * 0.38) * 0.24,
    rotation: Math.cos(seconds * 0.38) * 0.28,
    stretch: 1 + hop * 0.06,
  };
}
export function animateShark(shark, seconds) {
  const pose = sharkPose(seconds);
  shark.position.set(pose.x, pose.y, pose.z);
  shark.rotation.set(0, pose.rotation, Math.sin(seconds * 2.8) * 0.08);
  shark.scale.set(1 / Math.sqrt(pose.stretch), pose.stretch, 1);
}
