import { ExtrudeGeometry, Group, Shape, TorusGeometry } from 'three';
import { createTerrain } from '../terrain.js';
import { addPond, addWaterfall } from '../props.js';
import { ball, box, cone, cylinder, mesh, material } from '../primitives.js';
import { createIslandShell, addAnimal, crystal, mound, cactus, ring } from './shared.js';

// All four factories stay local to the island. Core owns publication and interaction.
function starGeometry() {
  const outline = new Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.42 : 1;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i) outline.lineTo(x, y);
    else outline.moveTo(x, y);
  }
  outline.closePath();
  return new ExtrudeGeometry(outline, { depth: 0.05, bevelEnabled: false });
}

function palm(parent, x, y, z, height = 2.2) {
  const root = new Group();
  root.position.set(x, y, z);
  parent.add(root);
  for (let i = 0; i < 4; i++) {
    const trunk = cylinder(
      root,
      '#b59c77',
      [i * 0.035, ((i + 0.5) * height) / 4, 0],
      0.1,
      height / 4 + 0.03,
      7,
      0.085,
    );
    trunk.rotation.z = -0.045;
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const leaf = ball(
      root,
      i % 2 ? '#88ad7b' : '#9bbb80',
      [Math.cos(angle) * 0.48 + 0.12, height, Math.sin(angle) * 0.48],
      [0.75, 0.08, 0.2],
    );
    leaf.rotation.y = -angle;
    leaf.rotation.z = Math.cos(angle) * -0.14;
  }
  for (const dx of [-0.1, 0.1])
    ball(root, '#b2926f', [0.12 + dx, height - 0.12, 0.05], [0.12, 0.15, 0.12]);
  return root;
}

function animatedButterfly(record) {
  const motion = addAnimal(record, 'butterfly', '#b8a8d5');
  const butterfly = motion.group;
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new Group();
    wing.position.y = 0.4;
    wing.userData.animated = true;
    const pieces = butterfly.children.filter(
      (child) => child.isMesh && child.position.x * side > 0.16,
    );
    for (const piece of pieces) {
      piece.position.y -= 0.4;
      wing.add(piece);
    }
    ball(wing, '#efdfbc', [side * 0.34, 0.16, 0.06], [0.08, 0.07, 0.035]);
    butterfly.add(wing);
    wings.push({ wing, side });
  }
  const phase = 1.37 * 9;
  motion.update = (seconds) => {
    const t = seconds + phase;
    butterfly.position.set(
      0.45 + Math.sin(t * 0.62) * 0.65,
      record.top + 1.45 + Math.sin(t * 1.3) * 0.24,
      0.25 + Math.cos(t * 0.52) * 0.3,
    );
    butterfly.rotation.set(0, Math.sin(t * 0.4) * 0.45, Math.sin(t * 1.8) * 0.08);
    for (const { wing, side } of wings) wing.rotation.y = side * (0.2 + Math.sin(t * 8.2) * 0.55);
  };
  motion.update(0);
  return motion;
}

function dreamIsland(record, preset) {
  const { landmarks, house, top, animate } = record;
  // Suspended stone gardens rise at different levels behind the front clearing.
  for (const [x, z, size, level] of [
    [-0.65, -2.35, 1.15, 3.1],
    [2.1, -2.2, 1.0, 3.5],
    [3.55, -0.8, 0.62, 2.3],
  ]) {
    const floating = createTerrain({
      radius: size,
      depth: 1.25,
      top: level,
      seed: Math.round(size * 81),
      palette: preset.palette,
    });
    floating.group.position.set(x, 0, z);
    landmarks.add(floating.group);
    crystal(landmarks, x, level + 0.14, z, '#c8c2da', 0.6);
  }
  const moon = mesh(
    landmarks,
    new TorusGeometry(0.75, 0.13, 6, 28, Math.PI * 1.5),
    '#e4d3aa',
    [-1.1, 4.7, -2.7],
  );
  moon.rotation.z = -Math.PI / 4;
  const star = starGeometry();
  for (const [x, y, z, scale] of [
    [0.7, 4.7, -2.1, 0.22],
    [2.9, 4.5, -2.8, 0.16],
    [-2.7, 3.3, -2.7, 0.17],
  ]) {
    mesh(landmarks, star, '#e5d5a9', [x, y, z], [scale, scale, scale]);
  }
  const glowLavender = material('#d5b5d4').clone();
  glowLavender.emissive.set('#b295cb');
  const glowGold = material('#e3d199').clone();
  glowGold.emissive.set('#d3bd86');
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.4;
    const x = Math.cos(angle) * 3.7;
    const z = -0.8 + Math.sin(angle) * 2.25;
    // Tall glowing plants stay on the back/sides, away from all five NPC positions.
    if (z > 1.2 && Math.abs(x) < 3.5) continue;
    cylinder(landmarks, '#8c9eac', [x, top + 0.22, z], 0.025, 0.44, 5);
    const bulb = ball(landmarks, '#d5b5d4', [x, top + 0.49, z], [0.14, 0.22, 0.14]);
    bulb.material = i % 2 ? glowLavender : glowGold;
  }
  animate.push((seconds) => {
    glowLavender.emissiveIntensity = 0.17 + Math.sin(seconds * 1.3) * 0.045;
    glowGold.emissiveIntensity = 0.15 + Math.sin(seconds * 1.1 + 1.7) * 0.045;
  });
  // Small roof observatory gives the Lecture cottage its own fantasy silhouette.
  ball(house, '#d4d1dc', [0.35, 2.2, -0.2], [0.55, 0.34, 0.5]);
  const observatoryBand = ring(house, '#ad9fbf', 0.35, 2.25, -0.2, 0.52, 0.045);
  observatoryBand.scale.z = 0.9;
  mesh(house, star, '#e5d5a9', [-0.5, 2.25, 0.4], [0.18, 0.18, 0.18]);
  animatedButterfly(record);
  const jelly = addAnimal(record, 'jellyfish', '#d1bad8', 1);
  jelly.update = (seconds) => {
    const t = seconds + 3.2;
    jelly.group.position.set(
      2.25 + Math.sin(t * 0.45) * 0.3,
      top + 2.4 + Math.sin(t * 1.5) * 0.23,
      -0.2 + Math.cos(t * 0.4) * 0.3,
    );
    jelly.group.rotation.set(0, Math.sin(t * 0.6) * 0.24, Math.sin(t * 1.2) * 0.08);
    jelly.group.scale.setScalar(0.65 + Math.sin(t * 2.1) * 0.025);
  };
  jelly.update(0);
}

function desertIsland(record) {
  const { landmarks, house, top } = record;
  const dune = mound(landmarks, -0.1, top, -2.2, [2.5, 1.7, 1.45], '#e6c995');
  dune.rotation.y = -0.25;
  const second = mound(landmarks, 2.85, top, -1.5, [1.45, 1.1, 1.8], '#efd7a7');
  second.rotation.y = 0.4;
  // Low curved wind ridges and a sandstone shoulder prevent a plain sandy disk.
  for (let i = 0; i < 3; i++) {
    const ridge = mesh(
      landmarks,
      new TorusGeometry(1.25 + i * 0.19, 0.035, 4, 20, Math.PI * 0.85),
      '#d9bc8d',
      [-0.15, top + 0.21, -0.35],
    );
    ridge.rotation.x = Math.PI / 2;
    ridge.rotation.z = 0.2;
    ridge.scale.z = 0.6;
    ridge.userData.detail = true;
  }
  addPond(landmarks, 2.35, top + 0.16, 0.75, 0.95);
  palm(landmarks, 2.65, top, -2.6, 2.15);
  palm(landmarks, -3.5, top, -2.2, 1.8);
  cactus(landmarks, -3.6, top, -0.9, 0.85);
  cactus(landmarks, 3.9, top, -1.7, 0.75);
  cactus(landmarks, -0.75, top, -3.5, 0.7);
  for (const [x, z, size] of [
    [3.95, 1.9, 0.42],
    [-3.7, 0.7, 0.35],
    [1.6, -3.4, 0.45],
  ]) {
    mound(landmarks, x, top + size * 0.25, z, [size, size * 0.55, size * 0.8], '#cdb28c');
  }
  // Roof vents and clay jars keep the common cottage recognizable but theme-specific.
  ball(house, '#d8ba8d', [0.45, 2.25, -0.3], [0.34, 0.18, 0.34]);
  cylinder(house, '#b89b78', [0.45, 2.4, -0.3], 0.11, 0.2, 8);
  for (const x of [-0.9, 0.9]) {
    ball(house, '#cca27d', [x, 0.43, 0.84], [0.18, 0.24, 0.18]);
    cylinder(house, '#b38b69', [x, 0.66, 0.84], 0.08, 0.05, 8);
  }
  const shark = addAnimal(record, 'shark', '#89b9b0');
  for (const z of [-0.31, 0.31])
    mesh(shark.group, new TorusGeometry(0.1, 0.018, 5, 12), '#dbc293', [0.65, 0.42, z]);
  shark.update = (seconds) => {
    const t = seconds + 13.7;
    const hop = Math.max(0, Math.sin(t * 2.65));
    shark.group.position.set(
      0.35 + Math.sin(t * 0.42) * 0.6,
      top + 0.33 + hop * 0.62,
      0.3 + Math.cos(t * 0.38) * 0.25,
    );
    shark.group.rotation.set(0, Math.sin(t * 0.42) * 0.3, Math.sin(t * 2.65) * 0.09);
    shark.group.scale.set(1 - hop * 0.025, 1 + hop * 0.065, 1);
  };
  shark.update(0);
}

function skyIsland(record, preset) {
  const { landmarks, house, top } = record;
  for (let i = 0; i < 11; i++) {
    const angle = (i * Math.PI * 2) / 11;
    ball(
      landmarks,
      i % 2 ? '#edf0e6' : '#f5f3e9',
      [Math.cos(angle) * 3.95, top - 0.95 + Math.sin(i) * 0.08, Math.sin(angle) * 3.3],
      [0.95, 0.43, 0.68],
    );
  }
  for (let i = 0; i < 5; i++)
    box(
      landmarks,
      '#ebeadb',
      [0.5 + i * 0.45, top + 0.3 + i * 0.25, -1.3 - i * 0.3],
      [0.9, 0.22, 0.65],
    );
  const satellite = createTerrain({
    radius: 1.4,
    top: top + 1.8,
    depth: 1.3,
    seed: 51,
    palette: preset.palette,
  });
  satellite.group.position.set(2.7, 0, -2.8);
  landmarks.add(satellite.group);
  // A little cloud gateway sits well behind the Lecture and NPC clearing.
  for (let i = 0; i <= 6; i++) {
    const angle = (i * Math.PI) / 6;
    ball(
      landmarks,
      '#eef1e7',
      [-1.25 + Math.cos(angle) * 1.0, top + 0.65 + Math.sin(angle) * 1.1, -2.7],
      [0.34, 0.31, 0.3],
    );
  }
  addWaterfall(landmarks, 3.2, -1.9, top + 1.8, -1.4, 0.55);
  for (const [x, z] of [
    [-0.1, -2.7],
    [3.6, -2.35],
    [2.6, -3.65],
  ])
    crystal(landmarks, x, top + 1.9, z, '#c6dbe0', 0.35);
  // Sun dial and gold weather vane identify the cloud Lecture hut at close range.
  const sun = ball(house, '#ead59d', [0.4, 2.3, -0.2], [0.32, 0.32, 0.08]);
  sun.rotation.y = 0.1;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const ray = box(
      house,
      '#ead59d',
      [0.4 + Math.cos(a) * 0.43, 2.3 + Math.sin(a) * 0.43, -0.2],
      [0.18, 0.045, 0.035],
    );
    ray.rotation.z = a;
  }
  const fish = addAnimal(record, 'fish', '#9fc9d1');
  const tailPiece = fish.group.children.find((child) => child.isMesh && child.position.x < -0.5);
  const tail = new Group();
  tail.position.set(-0.5, 0.42, 0);
  tail.userData.animated = true;
  tailPiece.position.sub(tail.position);
  tail.add(tailPiece);
  fish.group.add(tail);
  fish.update = (seconds) => {
    const t = seconds + 15.07;
    fish.group.position.set(
      0.45 + Math.sin(t * 0.5) * 0.75,
      top + 1.2 + Math.sin(t * 1.35) * 0.23,
      0.2 + Math.cos(t * 0.42) * 0.3,
    );
    fish.group.rotation.set(0, Math.cos(t * 0.5) * 0.3, Math.sin(t * 1.2) * 0.06);
    tail.rotation.y = Math.sin(t * 7.4) * 0.35;
  };
  fish.update(0);
}

function festivalIsland(record) {
  const { landmarks, house, top, animate } = record;
  for (let i = 0; i < 3; i++)
    cylinder(
      landmarks,
      i % 2 ? '#e7d8b1' : '#b8c58f',
      [0.7, top + 0.18 + i * 0.28, -1.8],
      2.3 - i * 0.6,
      0.32,
      18,
    );
  const pavilion = new Group();
  pavilion.position.set(0.7, top + 0.83, -1.8);
  landmarks.add(pavilion);
  for (const x of [-0.8, 0.8])
    for (const z of [-0.6, 0.6]) cylinder(pavilion, '#d8c292', [x, 0.65, z], 0.055, 1.3, 7);
  const canopy = cone(pavilion, '#e8d0a2', [0, 1.5, 0], 1.35, 0.6, 8);
  canopy.scale.z = 0.85;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ball(
      pavilion,
      ['#d88d87', '#e7c571', '#8ebbc0'][i % 3],
      [Math.cos(angle) * 1.15, 1.25, Math.sin(angle) * 0.97],
      [0.22, 0.12, 0.18],
    );
  }
  for (const x of [-2.8, 3.2]) cylinder(landmarks, '#ac8b68', [x, top + 1.65, -2.8], 0.06, 3.3, 7);
  for (let i = 0; i < 13; i++) {
    const flag = cone(
      landmarks,
      ['#d88d87', '#e7c571', '#8ebbc0'][i % 3],
      [-2.6 + i * 0.44, top + 3.1 - Math.sin((i / 12) * Math.PI) * 0.3, -2.8],
      0.18,
      0.34,
      3,
    );
    flag.rotation.z = Math.PI;
  }
  for (const [x, z, color, phase] of [
    [-3.4, -1.6, '#d5a5b9', 0],
    [3.2, -1.4, '#a7c6c4', 1.7],
  ]) {
    const balloon = new Group();
    balloon.position.set(x, top + 2.2, z);
    balloon.userData.animated = true;
    landmarks.add(balloon);
    ball(balloon, color, [0, 0.5, 0], [0.29, 0.36, 0.27]);
    cylinder(balloon, '#c0ac87', [0, 0.05, 0], 0.012, 0.45, 4);
    animate.push((seconds) => {
      balloon.position.y = top + 2.2 + Math.sin(seconds * 0.9 + phase) * 0.12;
    });
  }
  addWaterfall(landmarks, 3.9, 1.9, top + 0.1, -2.3, 0.7);
  // Painted roof ribbons keep the Lecture building recognizable from the festival.
  for (let i = 0; i < 5; i++) {
    const pennant = cone(
      house,
      ['#d88d87', '#e7c571', '#8ebbc0'][i % 3],
      [-0.7 + i * 0.35, 1.95, 0.88],
      0.1,
      0.19,
      3,
    );
    pennant.rotation.z = Math.PI;
  }
  const dinosaur = addAnimal(record, 'dinosaur', '#90b695');
  const feet = dinosaur.group.children.filter(
    (child) => child.isMesh && Math.abs(child.position.y - 0.11) < 0.001,
  );
  feet.forEach((foot) => {
    foot.userData.animated = true;
  });
  dinosaur.update = (seconds) => {
    const t = seconds + 16.44;
    const beat = Math.sin(t * 3.2);
    dinosaur.group.position.set(
      0.45 + Math.sin(t * 0.55) * 0.45,
      top + 0.3 + Math.max(0, beat) * 0.28,
      0.25 + Math.cos(t * 0.5) * 0.22,
    );
    dinosaur.group.rotation.set(0, Math.sin(t * 1.6) * 0.35, beat * 0.12);
    feet.forEach((foot, i) => {
      foot.position.y = 0.11 + Math.max(0, Math.sin(t * 3.2 + i * Math.PI)) * 0.12;
    });
  };
  dinosaur.update(0);
}

export function createDreamIsland(preset) {
  const record = createIslandShell(preset);
  switch (preset.id) {
    case 'S09':
      dreamIsland(record, preset);
      break;
    case 'S10':
      desertIsland(record);
      break;
    case 'S11':
      skyIsland(record, preset);
      break;
    case 'S12':
      festivalIsland(record);
      break;
    default:
      throw new Error('Dream 島嶼模組不支援此單元');
  }
  record.animate.forEach((update) => update(0));
  return record;
}
