import {
  CatmullRomCurve3,
  Group,
  LatheGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { ball, box, cone, cylinder, mesh } from '../primitives.js';
import { createIslandShell, addAnimal, crystal, mound, ring } from './shared.js';

function addRock(parent, x, y, z, size, color = '#747785') {
  const rock = ball(parent, color, [x, y, z], [size, size * 0.76, size * 0.85], 7);
  rock.rotation.set(x * 0.13, z * 0.2, x * 0.09);
  return rock;
}

function frostPine(parent, x, y, z, size = 1) {
  const pine = new Group();
  pine.position.set(x, y, z);
  pine.scale.setScalar(size);
  parent.add(pine);
  cylinder(pine, '#a5a99a', [0, 0.5, 0], 0.09, 1, 7);
  for (let i = 0; i < 3; i++) {
    cone(pine, '#93b4b0', [0, 0.75 + i * 0.42, 0], 0.52 - i * 0.12, 0.8, 7);
    cone(pine, '#eff1e8', [0, 0.88 + i * 0.42, 0], 0.42 - i * 0.1, 0.64, 7);
  }
}

function peppermint(parent, x, y, z, color) {
  cylinder(parent, '#f1dfb8', [x, y + 0.6, z], 0.065, 1.2, 7);
  const candy = mesh(parent, new TorusGeometry(0.43, 0.15, 7, 18), color, [x, y + 1.36, z]);
  candy.rotation.y = 0.14;
  ball(parent, '#f7dfad', [x, y + 1.36, z], [0.27, 0.27, 0.13]);
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const stripe = box(
      parent,
      '#fff0d9',
      [x + Math.cos(angle) * 0.28, y + 1.36 + Math.sin(angle) * 0.28, z + 0.11],
      [0.08, 0.23, 0.04],
    );
    stripe.rotation.z = angle - 0.7;
  }
}

function addFantasyAnimal(record, preset) {
  const color = preset.id === 'S05' ? '#88aaa0' : preset.id === 'S07' ? '#d5aebd' : '#89b9b0';
  const motion = addAnimal(record, preset.animal, color);
  const animal = motion.group;
  const phase = Number(preset.id.slice(1)) * 1.37;

  if (preset.id === 'S05') {
    // A small fern-shaped back crest makes this little dinosaur distinct from the festival animal.
    const crest = new Group();
    crest.position.set(0, 1.1, -0.02);
    animal.add(crest);
    for (const x of [-0.11, 0, 0.11])
      cone(crest, '#e6ba81', [x, 0.14 + (x === 0 ? 0.1 : 0), 0], 0.08, 0.28, 4);
    motion.update = (seconds) => {
      const t = seconds + phase;
      const hop = Math.max(0, Math.sin(t * 2.6));
      animal.position.set(
        0.45 + Math.sin(t * 0.39) * 0.4,
        record.top + 0.23 + hop * 0.48,
        0.4 + Math.cos(t * 0.39) * 0.16,
      );
      animal.rotation.set(0, Math.sin(t * 0.39) * 0.32, Math.sin(t * 2.6) * 0.06);
      animal.scale.set(1 - hop * 0.04, 1 + hop * 0.06, 1 - hop * 0.04);
    };
  } else if (preset.id === 'S06') {
    const tail = new Group();
    tail.position.set(0, 0.59, -0.52);
    tail.userData.animated = true;
    animal.add(tail);
    ball(tail, '#fff0de', [0, 0, 0], [0.15, 0.18, 0.18]);
    motion.update = (seconds) => {
      const t = seconds + phase,
        hop = Math.max(0, Math.sin(t * 2.9));
      animal.position.set(
        0.45 + Math.sin(t * 0.35) * 0.42,
        record.top + 0.2 + hop * 0.42,
        0.4 + Math.cos(t * 0.35) * 0.12,
      );
      animal.rotation.set(0, Math.sin(t * 0.35) * 0.26, Math.sin(t * 2.9) * 0.05);
      animal.scale.set(1 - hop * 0.035, 1 + hop * 0.07, 1 - hop * 0.035);
      tail.rotation.x = Math.sin(t * 4.1) * 0.3;
    };
  } else if (preset.id === 'S07') {
    ball(animal, '#d4acbd', [0, 1.23, -0.01], [0.25, 0.11, 0.24]);
    ball(animal, '#f4ebdd', [0.04, 1.38, -0.02], [0.09, 0.09, 0.09]);
    const scarf = box(animal, '#d4acbd', [0.15, 0.61, 0.29], [0.12, 0.28, 0.05]);
    scarf.userData.animated = true;
    motion.update = (seconds) => {
      const t = seconds + phase;
      animal.position.set(
        0.45 + Math.sin(t * 0.55) * 0.42,
        record.top + 0.18 + Math.abs(Math.sin(t * 3.5)) * 0.035,
        0.45 + Math.cos(t * 0.55) * 0.13,
      );
      animal.rotation.set(0, Math.sin(t * 0.55) * 0.38, Math.sin(t * 3.5) * 0.085);
      scarf.rotation.z = Math.sin(t * 3.5 + 0.6) * 0.14;
    };
  } else {
    const tail = animal.children.find(
      (child) => child.geometry?.type === 'ConeGeometry' && child.position.x < -0.5,
    );
    if (tail) tail.userData.animated = true;
    motion.update = (seconds) => {
      const t = seconds + phase;
      animal.position.set(
        0.45 + Math.sin(t * 0.55) * 0.6,
        record.top + 1.12 + Math.sin(t * 1.45) * 0.18,
        0.4 + Math.sin(t * 1.1) * 0.17,
      );
      animal.rotation.set(0, Math.cos(t * 0.55) * 0.25, Math.sin(t * 1.45) * 0.07);
      if (tail) tail.rotation.y = Math.sin(t * 6) * 0.28;
    };
  }
  motion.update(0);
}

function volcano(record) {
  const { top, landmarks, house, animate } = record;
  const profile = [
    [1.9, 0],
    [1.72, 0.42],
    [1.29, 1.24],
    [0.93, 2.58],
    [0.74, 2.73],
    [0.65, 2.34],
    [0, 2.3],
  ].map(([r, h]) => new Vector2(r, h));
  const volcanoGeometry = new LatheGeometry(profile, 18);
  const vertices = volcanoGeometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i),
      y = vertices.getY(i);
    const angle = Math.atan2(z, x),
      variation = 1 + Math.sin(angle * 5 + y * 0.8) * 0.065 + Math.cos(angle * 3) * 0.035;
    vertices.setXYZ(i, x * variation, y, z * variation);
  }
  volcanoGeometry.computeVertexNormals();
  mesh(landmarks, volcanoGeometry, '#626575', [0.9, top, -1.8]);
  const lava = cylinder(landmarks, '#e99462', [0.9, top + 2.34, -1.8], 0.65, 0.05, 22);
  lava.userData.animated = true;
  ring(landmarks, '#b97965', 0.9, top + 2.67, -1.8, 0.82, 0.08);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    addRock(
      landmarks,
      0.9 + Math.cos(a) * 0.83,
      top + 2.68,
      -1.8 + Math.sin(a) * 0.83,
      0.16,
      '#79707b',
    );
  }
  for (const [x, z, size] of [
    [-3.4, -2, 0.55],
    [-0.7, -3.5, 0.6],
    [2.8, -2.6, 0.58],
    [3.6, -0.5, 0.45],
    [-3.7, 0.3, 0.32],
  ]) {
    addRock(landmarks, x, top + size * 0.38, z, size);
  }
  const flow = new CatmullRomCurve3([
    new Vector3(1.8, top + 1.6, -0.9),
    new Vector3(1.93, top + 0.9, -0.77),
    new Vector3(2.25, top + 0.18, -0.45),
    new Vector3(2.7, top + 0.17, 0.25),
  ]);
  mesh(landmarks, new TubeGeometry(flow, 18, 0.07, 5, false), '#e4a16f');
  for (let i = 0; i < 4; i++) {
    const crack = box(
      landmarks,
      '#d79869',
      [2.6 + i * 0.17, top + 0.16, 0.3 + i * 0.19],
      [0.12, 0.035, 0.35],
    );
    crack.rotation.y = -0.5;
  }
  for (const x of [-3.6, 3.3]) {
    cylinder(landmarks, '#7e8178', [x, top + 0.22, -1.7], 0.05, 0.4, 5);
    for (let j = 0; j < 3; j++) {
      const fern = cone(
        landmarks,
        '#a7aa83',
        [x + Math.sin(j * 2) * 0.12, top + 0.35, -1.7 + Math.cos(j * 2) * 0.1],
        0.12,
        0.35,
        3,
      );
      fern.rotation.z = Math.sin(j * 2) * 0.3;
    }
  }
  mesh(house, new TorusGeometry(0.13, 0.035, 5, 14), '#e6ba81', [0.64, 1.05, 0.84]);
  box(house, '#786c7f', [0.64, 1.05, 0.85], [0.018, 0.15, 0.04]);
  animate.push((seconds) => {
    const pulse = 1 + Math.sin(seconds + 0.3) * 0.025;
    lava.scale.set(pulse, 1, pulse);
  });
}

function candy(record) {
  const { top, landmarks, house } = record;
  for (const [x, z, size, color] of [
    [0, -2.1, 1.4, '#dabbd6'],
    [2.5, -1.7, 1.2, '#f5d3ad'],
    [3.4, -0.9, 0.65, '#b5d9cb'],
    [-1.7, -2.6, 0.8, '#edb5c4'],
  ]) {
    mound(landmarks, x, top, z, [size, size * 1.4, size], color);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ball(
        landmarks,
        '#fff0da',
        [x + Math.cos(a) * size * 0.45, top + size * 1.05, z + Math.sin(a) * size * 0.45],
        [size * 0.3, size * 0.16, size * 0.29],
      );
    }
  }
  peppermint(landmarks, -3.4, top, -1.6, '#dc9bb4');
  peppermint(landmarks, 1.7, top, -0.7, '#ba9ccc');
  peppermint(landmarks, 3.4, top, -2.1, '#dc9bb4');
  for (let i = 0; i < 6; i++) {
    const gumdrop = mound(
      landmarks,
      -1.1 + i * 0.65,
      top + 0.06,
      -3.25 + Math.sin(i) * 0.15,
      [0.22, 0.3, 0.22],
      i % 2 ? '#c5d9bb' : '#efbfbe',
    );
    gumdrop.userData.detail = true;
  }
  for (const x of [-0.78, 0.78]) cylinder(house, '#fff0da', [x, 0.95, 0.78], 0.07, 1.1, 7);
  const cookie = cylinder(house, '#e6c38f', [-0.72, 0.25, 0.98], 0.21, 0.08, 10);
  cookie.rotation.x = Math.PI / 2;
}

function snow(record) {
  const { top, landmarks, house } = record;
  for (const [x, z, r, h, lean] of [
    [-0.1, -2.2, 1.6, 3.2, -0.09],
    [1.8, -1.7, 1.3, 2.5, 0.12],
    [3.0, -0.9, 0.7, 1.5, 0.08],
  ]) {
    const peak = cone(landmarks, '#b1d4db', [x, top + h / 2, z], r, h, 5);
    peak.rotation.z = lean;
    const cap = cone(
      landmarks,
      '#edf1e8',
      [x - Math.sin(lean) * h * 0.3, top + h * 0.86, z],
      r * 0.48,
      h * 0.38,
      5,
    );
    cap.rotation.z = lean;
  }
  const pond = cylinder(landmarks, '#a1d3dc', [2.4, top + 0.18, 0.8], 1.0, 0.06, 24);
  pond.scale.z = 0.65;
  for (const [x, z, size] of [
    [-3.6, -1.3, 0.55],
    [-0.7, -0.7, 0.45],
    [3.7, -0.1, 0.55],
    [2.8, -2.7, 0.7],
  ])
    crystal(landmarks, x, top, z, '#bce1e3', size);
  frostPine(landmarks, -3.4, top, -2.3, 0.8);
  frostPine(landmarks, 3.6, top, -1.6, 0.6);
  for (const [x, z, size] of [
    [-3.6, 0.7, 0.55],
    [-3.9, -0.1, 0.35],
    [2.8, -3.1, 0.4],
  ])
    mound(landmarks, x, top + 0.05, z, [size, size * 0.27, size * 0.6], '#eff1e8');
  for (const x of [-0.85, -0.55, 0.55, 0.85]) {
    const icicle = cone(house, '#bedee2', [x, 1.47, -0.9], 0.07, 0.25, 5);
    icicle.rotation.z = Math.PI;
  }
}

function meadow(record) {
  const { top, landmarks, house, animate } = record;
  mound(landmarks, 0.5, top, -1.8, [2.6, 1, 1.7], '#9ebd77');
  mound(landmarks, 3.0, top, -0.8, [1.2, 0.7, 1.1], '#a9c783');
  cylinder(landmarks, '#d4c39d', [1.2, top + 0.25, -1.7], 0.9, 0.3, 14);
  cylinder(landmarks, '#e6d8b5', [1.2, top + 1.6, -1.7], 0.64, 2.8, 12, 0.43);
  cone(landmarks, '#a77d6a', [1.2, top + 3.2, -1.7], 0.8, 0.8, 12);
  box(landmarks, '#729583', [1.2, top + 0.65, -1.025], [0.36, 0.68, 0.08]);
  const rotor = new Group();
  rotor.position.set(1.2, top + 2.2, -0.98);
  rotor.userData.animated = true;
  landmarks.add(rotor);
  for (let i = 0; i < 4; i++) {
    const arm = new Group();
    arm.rotation.z = (i * Math.PI) / 2;
    rotor.add(arm);
    box(arm, '#b49d78', [0, 0.9, 0], [0.12, 1.9, 0.1]);
    box(arm, '#f7eaca', [0.17, 1.2, 0], [0.34, 1.1, 0.08]);
    for (const y of [0.85, 1.2, 1.55]) box(arm, '#c8b68d', [0.17, y, 0.055], [0.35, 0.035, 0.025]);
  }
  ball(rotor, '#c4ad81', [0, 0, 0.1], [0.18, 0.18, 0.15]);
  animate.push((seconds) => {
    rotor.rotation.z = seconds * 0.45;
  });
  for (const [x, z] of [
    [-0.8, -2.8],
    [2.8, -2.7],
  ]) {
    for (let i = 0; i < 6; i++) {
      const stalk = cylinder(
        landmarks,
        '#b5b884',
        [x + (i % 3) * 0.18, top + 0.27, z + Math.floor(i / 3) * 0.18],
        0.018,
        0.5,
        4,
      );
      const ear = ball(
        landmarks,
        '#dfc88c',
        [stalk.position.x, top + 0.55, stalk.position.z],
        [0.065, 0.16, 0.05],
        5,
      );
      ear.rotation.z = 0.2;
      stalk.userData.detail = ear.userData.detail = true;
    }
  }
  for (const x of [-0.8, 0.8]) box(house, '#b69a73', [x, 0.95, 0.78], [0.08, 1.1, 0.04]);
  for (const [x, z] of [
    [-3.3, -1.7],
    [-3.8, -1.4],
  ]) {
    const bale = cylinder(landmarks, '#d5bd83', [x, top + 0.2, z], 0.28, 0.45, 9);
    bale.rotation.z = Math.PI / 2;
  }
}

export function createFantasyIsland(preset) {
  const record = createIslandShell(preset);
  const build = { S05: volcano, S06: candy, S07: snow, S08: meadow }[preset.id];
  if (!build) throw new Error('島嶼模組不支援此單元');
  build(record);
  addFantasyAnimal(record, preset);
  return record;
}
