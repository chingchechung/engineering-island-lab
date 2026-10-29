import { Group, TorusGeometry } from 'three';
import { ball, box, cone, cylinder, mesh } from './primitives.js';
import { createShark } from './animals.js';

function eyes(group, y, z, spread = 0.15) {
  for (const x of [-spread, spread]) {
    ball(group, '#314c55', [x, y, z], [0.045, 0.06, 0.035]);
    ball(group, '#ffffff', [x + 0.014, y + 0.025, z + 0.025], [0.013, 0.016, 0.012]);
  }
}
export function createCreature(kind, color = '#87bbb1') {
  const group = kind === 'shark' ? createShark() : new Group();
  group.name = `decorative-${kind}`;
  group.userData.decoration = true;
  group.userData.animated = true;
  if (kind === 'fish') {
    ball(group, color, [0, 0.4, 0], [0.6, 0.32, 0.24]);
    const tail = cone(group, '#efbc6e', [-0.65, 0.42, 0], 0.3, 0.42, 3);
    tail.rotation.z = -Math.PI / 2;
    cone(group, '#eeb568', [0, 0.72, 0], 0.17, 0.25, 4);
    ball(group, '#fff1d4', [0.15, 0.29, 0.12], [0.37, 0.15, 0.14]);
    ball(group, '#35525c', [0.39, 0.48, 0.19], [0.065, 0.075, 0.035]);
    ball(group, '#ffffff', [0.41, 0.5, 0.215], [0.02, 0.02, 0.012]);
  } else if (kind === 'penguin') {
    ball(group, '#536b7b', [0, 0.5, 0], [0.35, 0.54, 0.3]);
    ball(group, '#f4f0db', [0, 0.48, 0.19], [0.27, 0.43, 0.16]);
    ball(group, '#50697b', [0, 0.96, 0.01], [0.29, 0.3, 0.27]);
    for (const x of [-0.15, 0.15]) {
      ball(group, '#efb96c', [x, 0.055, 0.15], [0.14, 0.07, 0.24]);
      ball(group, '#f4f0db', [x * 0.78, 0.99, 0.22], [0.115, 0.13, 0.07]);
    }
    eyes(group, 1.02, 0.28, 0.11);
    const beak = cone(group, '#edb56e', [0, 0.89, 0.36], 0.09, 0.22, 5);
    beak.rotation.x = Math.PI / 2;
    for (const x of [-0.36, 0.36]) {
      const wing = ball(group, '#607b88', [x, 0.54, 0], [0.1, 0.34, 0.15]);
      wing.rotation.z = x;
    }
    box(group, color, [0, 0.77, 0.24], [0.55, 0.1, 0.08]);
  } else if (kind === 'jellyfish') {
    ball(group, color, [0, 0.9, 0], [0.5, 0.34, 0.44]);
    cylinder(group, '#f0d8dc', [0, 0.75, 0], 0.46, 0.08, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const tentacle = mesh(
        group,
        new TorusGeometry(0.17, 0.035, 5, 10, Math.PI * 1.4),
        '#afc8d3',
        [Math.cos(a) * 0.27, 0.4, Math.sin(a) * 0.25],
      );
      tentacle.rotation.y = a;
    }
    eyes(group, 0.9, 0.41, 0.14);
  } else if (kind === 'dinosaur') {
    ball(group, color, [0, 0.45, 0], [0.42, 0.4, 0.55]);
    ball(group, color, [0, 0.88, 0.28], [0.34, 0.39, 0.34]);
    ball(group, '#f4dbac', [0, 0.76, 0.51], [0.28, 0.15, 0.24]);
    for (const x of [-0.23, 0.23]) {
      ball(group, color, [x, 0.11, 0.13], [0.17, 0.12, 0.27]);
      ball(group, color, [x * 1.7, 0.5, 0.18], [0.13, 0.18, 0.13]);
    }
    const tail = cone(group, color, [0, 0.4, -0.67], 0.24, 0.8, 7);
    tail.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 4; i++)
      cone(group, '#eeb575', [0, 0.77 - i * 0.08, -0.1 - i * 0.18], 0.12, 0.22, 4);
    eyes(group, 0.98, 0.57);
  } else if (kind === 'sheep') {
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      ball(
        group,
        i % 2 ? '#fff0de' : '#f2dfe0',
        [Math.cos(a) * 0.25, 0.6 + Math.sin(i) * 0.12, Math.sin(a) * 0.34],
        [0.29, 0.28, 0.3],
      );
    }
    ball(group, '#a58e8a', [0, 0.79, 0.52], [0.24, 0.27, 0.22]);
    for (const x of [-0.2, 0.2])
      for (const z of [-0.23, 0.22]) cylinder(group, '#9b8581', [x, 0.17, z], 0.075, 0.3, 7);
    for (const x of [-0.28, 0.28]) ball(group, '#dbb9bd', [x, 0.86, 0.49], [0.18, 0.07, 0.1]);
    eyes(group, 0.84, 0.72, 0.09);
  } else if (kind === 'butterfly') {
    ball(group, '#786f8c', [0, 0.4, 0], [0.08, 0.3, 0.1]);
    for (const x of [-1, 1]) {
      const wing = ball(group, color, [x * 0.32, 0.55, 0], [0.34, 0.33, 0.06]);
      wing.rotation.z = -x * 0.35;
      ball(group, '#e9c782', [x * 0.3, 0.28, 0], [0.23, 0.2, 0.07]);
    }
    eyes(group, 0.65, 0.09, 0.04);
  } else if (kind === 'panda') {
    ball(group, '#c59373', [0, 0.45, 0], [0.4, 0.42, 0.38]);
    ball(group, '#efd9b5', [0, 0.95, 0.12], [0.36, 0.32, 0.3]);
    for (const x of [-0.25, 0.25]) {
      ball(group, '#966b5d', [x, 1.23, 0.09], [0.14, 0.15, 0.1]);
      ball(group, '#886758', [x * 0.64, 0.97, 0.37], [0.11, 0.1, 0.03]);
      ball(group, '#7c6459', [x, 0.13, 0.15], [0.13, 0.12, 0.2]);
    }
    eyes(group, 0.99, 0.41, 0.14);
    ball(group, '#4e5250', [0, 0.87, 0.43], [0.06, 0.04, 0.04]);
    for (let i = 0; i < 5; i++)
      ball(
        group,
        i % 2 ? '#ead3af' : '#b87f61',
        [0.23 + i * 0.12, 0.3, -0.3 - i * 0.09],
        [0.18, 0.16, 0.18],
      );
  } else if (kind === 'crystal') {
    const body = mesh(group, new TorusGeometry(0.4, 0.12, 5, 6), '#d9bfdb', [0, 0.55, 0]);
    body.rotation.x = 0.4;
    cone(group, color, [0, 0.65, 0], 0.34, 0.95, 5);
    cone(group, '#c6d7e5', [0, 0.15, 0], 0.29, 0.42, 5).rotation.z = Math.PI;
    eyes(group, 0.56, 0.3, 0.11);
  } else if (kind === 'turtle') {
    ball(group, '#78aaa0', [0, 0.42, 0], [0.5, 0.26, 0.62]);
    ball(group, '#90b27f', [0, 0.57, -0.05], [0.45, 0.22, 0.51]);
    for (const x of [-1, 1])
      for (const z of [-0.3, 0.3]) {
        const flipper = ball(group, '#a5c6a3', [x * 0.47, 0.33, z], [0.34, 0.06, 0.17]);
        flipper.rotation.y = x * z;
      }
    ball(group, '#abcaa6', [0, 0.45, 0.7], [0.22, 0.2, 0.29]);
    eyes(group, 0.52, 0.93, 0.11);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ball(
        group,
        '#b5cb8f',
        [Math.cos(a) * 0.24, 0.75, Math.sin(a) * 0.25 - 0.05],
        [0.11, 0.035, 0.12],
      );
    }
  }
  return group;
}

export function animateCreature(group, kind, seconds, phase, baseY = 1.05) {
  const t = seconds + phase,
    hop = ['shark', 'dinosaur', 'sheep', 'panda'].includes(kind);
  group.position.set(
    0.5 + Math.sin(t * 0.45) * 0.65,
    baseY + (hop ? Math.max(0, Math.sin(t * 2.7)) * 0.55 : 0.8 + Math.sin(t * 1.8) * 0.25),
    0.4 + Math.cos(t * 0.4) * 0.3,
  );
  group.rotation.set(
    0,
    Math.sin(t * 0.5) * 0.35,
    Math.sin(t * (kind === 'butterfly' ? 6 : 2)) * 0.09,
  );
}
