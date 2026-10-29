import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { box, cylinder, material, mesh, random } from './primitives.js';

// Only static, original geometry lives here. Core owns placement, picking and animation.
const stoneMaterial = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 1,
  flatShading: true,
});
stoneMaterial.userData.shared = true;
const UP = new Vector3(0, 1, 0);
const NPC_CENTERS = [
  [-2.8, 2],
  [-0.9, 3.1],
  [1.3, 2.8],
  [3, 1.5],
  [3.6, 0.1],
];
const ANIMAL_CENTERS = [
  [0.4, 0.3],
  [1.7, -0.4],
  [0.15, -1.3],
];
const PALETTES = {
  S01: ['#718a7a', '#a2ab87', '#d5c39e', '#568d69', '#a3bd73'],
  S02: ['#8c947e', '#b5ac8c', '#e4d1ac', '#76a576', '#caa5bf'],
  S03: ['#64828e', '#93a6a4', '#d8d1b6', '#8eaf9d', '#d6bfa0'],
  S04: ['#718f87', '#a3b297', '#d4d1ad', '#71a69a', '#c4bbd3'],
  S05: ['#454d60', '#696678', '#9d8a86', '#929a80', '#d9a075'],
  S06: ['#ad92ae', '#d5aec1', '#efd2b8', '#a8c7b0', '#e3a8bf'],
  S07: ['#82a8bd', '#abd0da', '#ecf0e6', '#a7c4c5', '#d2e9e6'],
  S08: ['#7d9276', '#adad84', '#d8c99f', '#7fa371', '#d6c087'],
  S09: ['#646987', '#9595b4', '#c7c5d3', '#b1a5c8', '#d9c597'],
  S10: ['#ab8c71', '#c5a47d', '#ebd1a3', '#98ad84', '#d3a58b'],
  S11: ['#9bb3c5', '#c9dce0', '#f2f0e1', '#a7c8ad', '#d7c69d'],
  S12: ['#8e967c', '#b9af8b', '#e8d2a8', '#91ad7b', '#d5a1af'],
  S13: ['#718b83', '#a6ae96', '#d1c49e', '#689678', '#a7bd80'],
  S14: ['#74748f', '#a49bb8', '#d1c3d8', '#a4bcc5', '#c1a2cc'],
  S15: ['#799f9c', '#b0c9b9', '#e4d9ba', '#8bbcac', '#d3a5b7'],
};

function geometry(vertices, colors = null) {
  const result = new BufferGeometry();
  result.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  if (colors) result.setAttribute('color', new Float32BufferAttribute(colors, 3));
  result.computeVertexNormals();
  result.computeBoundingSphere();
  return result;
}

// Unequal, offset contours make broken sloping rock instead of regular columns.
function brokenRock(colors, variant = 0) {
  const vertices = [],
    tones = [],
    segments = 7;
  const levels = [
    [-0.48, 0.68, -0.12],
    [-0.22, 1.04, 0.05],
    [0.17, 0.93, -0.04],
    [0.43, 0.61, 0.13],
  ];
  const ring = (j, i) => {
    const [y, radius, drift] = levels[j];
    const angle = ((i % segments) * Math.PI * 2) / segments;
    const wobble = 1 + Math.sin(angle * 3 + variant) * 0.14;
    return [
      Math.cos(angle) * radius * wobble + drift,
      y + Math.sin(angle * 2 + variant) * 0.055,
      Math.sin(angle) * radius * wobble * 0.8,
    ];
  };
  const tri = (a, b, c, color) => {
    vertices.push(...a, ...b, ...c);
    const tone = new Color(color);
    for (let n = 0; n < 3; n++) tones.push(tone.r, tone.g, tone.b);
  };
  for (let j = 0; j < levels.length - 1; j++)
    for (let i = 0; i < segments; i++) {
      const a = ring(j, i),
        b = ring(j, i + 1),
        c = ring(j + 1, i),
        d = ring(j + 1, i + 1);
      tri(a, c, b, colors[j % colors.length]);
      tri(b, c, d, colors[(j + (i % 3 === 0 ? 1 : 0)) % colors.length]);
    }
  for (let i = 0; i < segments; i++) tri(ring(3, i), [0.05, 0.5, 0], ring(3, i + 1), colors.at(-1));
  return geometry(vertices, tones);
}

// Folded pointed leaves, rather than a field of tiny spheres.
function leafGeometry() {
  return geometry([
    0, 0, 0, -0.15, 0.44, 0.05, 0, 0.34, 0.13, 0, 0, 0, 0, 0.34, 0.13, 0.15, 0.44, 0.05, -0.15,
    0.44, 0.05, 0, 0.92, -0.08, 0, 0.34, 0.13, 0, 0.34, 0.13, 0, 0.92, -0.08, 0.15, 0.44, 0.05, 0,
    0, 0, 0, 0.34, -0.04, -0.15, 0.44, 0.05, 0, 0, 0, 0.15, 0.44, 0.05, 0, 0.34, -0.04, -0.15, 0.44,
    0.05, 0, 0.34, -0.04, 0, 0.92, -0.08, 0, 0.34, -0.04, 0.15, 0.44, 0.05, 0, 0.92, -0.08,
  ]);
}

function flowerGeometry() {
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      b = a + Math.PI / 6,
      c = a + Math.PI / 3;
    const tip = [Math.cos(b) * 0.28, 0.08, Math.sin(b) * 0.28];
    const edge = [Math.cos(c) * 0.105, 0.035, Math.sin(c) * 0.105];
    vertices.push(
      0,
      0.1,
      0,
      ...tip,
      Math.cos(a) * 0.105,
      0.035,
      Math.sin(a) * 0.105,
      0,
      0.1,
      0,
      ...edge,
      ...tip,
      0,
      0.015,
      0,
      Math.cos(a) * 0.105,
      0.035,
      Math.sin(a) * 0.105,
      ...tip,
      0,
      0.015,
      0,
      ...tip,
      ...edge,
    );
  }
  return geometry(vertices);
}

function crystalGeometry() {
  const vertices = [];
  const p = (i, y, radius = 0.2) => [
    Math.cos((i * Math.PI) / 3) * radius,
    y,
    Math.sin((i * Math.PI) / 3) * radius,
  ];
  for (let i = 0; i < 6; i++)
    vertices.push(
      ...p(i, 0),
      ...p(i, 0.75),
      ...p(i + 1, 0),
      ...p(i + 1, 0),
      ...p(i, 0.75),
      ...p(i + 1, 0.75),
      ...p(i, 0.75),
      0.035,
      1.12,
      0.02,
      ...p(i + 1, 0.75),
    );
  return geometry(vertices);
}

function coastPoint(record, angle, size, y, drift = 0) {
  const surface = record.terrain.userData.surface ?? {
    radius: record.preset.radius,
    stretch: record.preset.stretch ?? 0.9,
  };
  const outline = record.terrain.parent?.userData.outline;
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const r = outline?.[Math.round((a / (Math.PI * 2)) * outline.length) % outline.length]?.r ?? 1;
  return [
    Math.cos(a) * r * surface.radius * size + drift,
    y,
    Math.sin(a) * r * surface.radius * size * surface.stretch,
  ];
}

function safeSurface(x, z, radius) {
  if (x > -3.85 - radius && x < -0.7 + radius && z > -1.55 - radius && z < 1.55 + radius)
    return false;
  if (NPC_CENTERS.some(([a, b]) => Math.hypot(x - a, z - b) < 1.25 + radius)) return false;
  return !ANIMAL_CENTERS.some(([a, b]) => Math.hypot(x - a, z - b) < 0.88 + radius);
}

function builder(record) {
  const { preset, top = 0.8 } = record;
  const colors = PALETTES[preset.id],
    rng = random(Number(preset.id.slice(1)) * 193 + 17);
  const group = new Group();
  group.name = 'themed-dressing';
  group.userData.decoration = true;
  group.userData.theme = preset.id;
  record.root.add(group);
  const placements = [],
    geometries = new Map(),
    instances = new Map();
  const getGeometry = (key, create) => {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  };
  let count = 0;
  const mark = (parent, kind, x, y, z, radius, height) => {
    const root = new Group();
    root.name = `dressing-${kind}`;
    root.position.set(x, y, z);
    root.userData.decoration = true;
    root.userData.dressingObstacle = { radius, height };
    parent.add(root);
    placements.push({ kind, x, z, baseY: y, radius, height });
    count++;
    return root;
  };
  const place = (kind, x, z, radius, height, build, y = top + 0.08) => {
    if (y + height > top + 0.2 && !safeSurface(x, z, radius)) return null;
    const root = mark(group, kind, x, y, z, radius, height);
    build(root);
    return root;
  };
  const rock = (parent, position, scale, variant = 0, palette = colors.slice(0, 3)) => {
    const key = `rock-${palette.join()}-${variant}`;
    const object = new Mesh(
      getGeometry(key, () => brokenRock(palette, variant)),
      stoneMaterial,
    );
    object.position.set(...position);
    object.scale.set(...scale);
    object.rotation.y = variant * 0.73;
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const branch = (parent, color, a, b, radius = 0.04) => {
    const from = new Vector3(...a),
      to = new Vector3(...b),
      direction = to.clone().sub(from);
    const object = mesh(
      parent,
      getGeometry('branch', () => new CylinderGeometry(0.72, 1, 1, 5)),
      color,
      from.lerp(to, 0.5).toArray(),
      [radius, direction.length(), radius],
    );
    object.quaternion.setFromUnitVectors(UP, direction.normalize());
    return object;
  };
  const instance = (kind, shape, color, position, scale, rotation = [0, 0, 0]) => {
    const key = `${kind}:${color}`;
    if (!instances.has(key)) instances.set(key, { kind, shape, color, values: [] });
    instances.get(key).values.push({ position, scale, rotation });
  };
  const leaves = (parent, x, y, z, size = 1, color = colors[3], count = 5) => {
    for (let i = 0; i < count; i++) {
      const object = mesh(
        parent,
        getGeometry('leaf', leafGeometry),
        color,
        [x, y, z],
        [size, size, size],
      );
      object.rotation.set(0.1 + (i % 2) * 0.22, (i * Math.PI * 2) / count, (i % 2 ? 1 : -1) * 0.28);
    }
  };
  const gem = (parent, x, y, z, scale, color = colors[4], tilt = 0) => {
    const result = mesh(parent, getGeometry('crystal', crystalGeometry), color, [x, y, z], scale);
    result.rotation.set(tilt * 0.3, x * 0.7, tilt);
    return result;
  };
  const water = (parent, color, points, width = 0.5) => {
    const vertices = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1],
        wa = width * (1 + (i % 2) * 0.18),
        wb = width * (1 + ((i + 1) % 2) * 0.18);
      vertices.push(
        a[0] - wa / 2,
        a[1],
        a[2],
        b[0] - wb / 2,
        b[1],
        b[2],
        a[0] + wa / 2,
        a[1],
        a[2],
        a[0] + wa / 2,
        a[1],
        a[2],
        b[0] - wb / 2,
        b[1],
        b[2],
        b[0] + wb / 2,
        b[1],
        b[2],
      );
    }
    const object = mesh(parent, geometry(vertices), color);
    object.castShadow = false;
    return object;
  };
  const finish = () => {
    const stamp = new Object3D();
    for (const { kind, shape, color, values } of instances.values()) {
      // Instance buffers belong to this dressing, so core can dispose a rebuilt world.
      const object = new InstancedMesh(shape, material(color), values.length);
      object.name = `dressing-instanced-${kind}`;
      object.userData.decoration = true;
      object.castShadow = false;
      object.receiveShadow = true;
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        stamp.position.set(...value.position);
        stamp.scale.set(...value.scale);
        stamp.rotation.set(...value.rotation);
        stamp.updateMatrix();
        object.setMatrixAt(i, stamp.matrix);
      }
      object.computeBoundingSphere();
      object.computeBoundingBox();
      group.add(object);
      count += values.length;
    }
    group.userData.placements = placements;
    group.userData.dressingCount = count;
    return { group, count, placements };
  };
  return {
    record,
    group,
    top,
    colors,
    rng,
    getGeometry,
    mark,
    place,
    rock,
    branch,
    leaves,
    gem,
    water,
    instance,
    finish,
  };
}

function shoreline(b) {
  const { record, top, group, colors, rock } = b;
  const depth = record.preset.depth ?? 3.3;
  const ringPoint = (a, size, y, drift = 0) => coastPoint(record, a, size, y, drift);
  const cliffSize = (drop) => {
    const profiles = [
      [0.25, 1.02],
      [depth * 0.3, 1.01],
      [depth * 0.68, 0.84],
      [depth, 0.6],
    ];
    for (let i = 1; i < profiles.length; i++) {
      const [d, size] = profiles[i],
        [previousDrop, previousSize] = profiles[i - 1];
      if (drop <= d)
        return previousSize + ((size - previousSize) * (drop - previousDrop)) / (d - previousDrop);
    }
    return 0.6;
  };
  // Discontinuous strata leave breaks and coves; every added ledge is below bridge decks.
  for (let arc = 0; arc < 5; arc++) {
    const start = 0.13 + arc * 1.27,
      length = 0.44 + (arc % 2) * 0.14;
    for (let layer = 0; layer < 2; layer++) {
      const vertices = [],
        tones = [];
      const y = top - 0.52 - layer * depth * 0.26;
      for (let i = 0; i < 7; i++) {
        const a = start + (length * i) / 7,
          c = start + (length * (i + 1)) / 7;
        const size = cliffSize(top - y) + 0.022;
        const p = ringPoint(a, size, y + Math.sin(a * 5) * 0.08);
        const q = ringPoint(c, size, y + Math.sin(c * 5) * 0.08);
        const r = ringPoint(a, size - 0.055, y - 0.22, 0.04);
        const s = ringPoint(c, size - 0.055, y - 0.22, 0.04);
        vertices.push(...p, ...q, ...r, ...q, ...s, ...r);
        const color = new Color(colors[(layer + 1) % 3]);
        for (let n = 0; n < 6; n++) tones.push(color.r, color.g, color.b);
      }
      const object = new Mesh(geometry(vertices, tones), stoneMaterial);
      object.name = 'dressing-cliff-stratum';
      object.receiveShadow = true;
      group.add(object);
    }
  }
  for (const [i, a] of [0.46, 1.15, 2.2, 3.58, 5.65].entries()) {
    const drop = 0.77 + (i % 2) * 0.7;
    const p = ringPoint(a, cliffSize(drop) + 0.015, top - drop);
    const root = b.mark(group, 'eroded-ledge', ...p, 0.67, 0.34);
    root.rotation.y = -a;
    rock(root, [0, 0, 0], [0.62 + (i % 3) * 0.15, 0.4, 0.45], i % 3);
    rock(root, [0.1, 0.18, -0.05], [0.48, 0.09, 0.34], (i + 1) % 3, [
      colors[2],
      colors[1],
      colors[3],
    ]);
  }
  // Broad fractured shoulders give the visible face a second depth plane. Their
  // highest vertices remain below the bank so bridge entries can use any angle.
  const shift = (Number(record.preset.id.slice(1)) % 3) * 0.055;
  for (const [i, a] of [0.24, 1.46, 2.48].entries()) {
    const p = ringPoint(a + shift, cliffSize(1.12) + 0.005, top - 1.12);
    const root = b.mark(group, 'fractured-cliff-shoulder', ...p, 0.72, 0);
    root.rotation.y = -a;
    const width = 0.59 + (i % 2) * 0.18;
    rock(root, [0, 0, 0], [width, 1.36 - i * 0.12, 0.51], i, [colors[0], colors[1], colors[2]]);
    rock(root, [0.16, -0.5, 0.06], [width * 0.85, 0.58, 0.48], (i + 2) % 3);
    b.leaves(root, -0.12, 0.62 - i * 0.035, 0.08, 0.32, colors[3], 4);
    b.leaves(root, 0.22, 0.47, 0.13, 0.25, colors[4], 3);
  }
}

function rimGarden(b, style = 'leaves') {
  const { top, colors, rng, record } = b;
  // A handful of coherent planted banks; preserve every full NPC roam disc.
  const leaf = leafGeometry(),
    blossom = flowerGeometry();
  let usedLeaf = false,
    usedBlossom = false;
  for (let bank = 0; bank < 7; bank++) {
    const angle = Math.PI * (1.04 + bank * 0.143);
    const radius = record.preset.radius * (0.75 + (bank % 2) * 0.04);
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius * (record.preset.stretch ?? 0.9);
    if (z > -1.05 || !safeSurface(x, z, 0.24)) continue;
    b.mark(b.group, `planted-${style}-bank`, x, top + 0.08, z, 0.24, 0.7);
    for (let j = 0; j < 6; j++) {
      const dx = (rng() - 0.5) * 0.45,
        dz = (rng() - 0.5) * 0.3,
        height = 0.28 + rng() * 0.38;
      b.instance(
        'foliage',
        leaf,
        j % 3 ? colors[3] : colors[4],
        [x + dx, top + 0.1, z + dz],
        [style === 'wheat' ? 0.32 : 0.55, style === 'reeds' ? height * 1.8 : height, 0.55],
        [0.15, rng() * Math.PI * 2, (rng() - 0.5) * 0.5],
      );
      usedLeaf = true;
      if (['flowers', 'stars', 'wheat'].includes(style) && j % 2 === 0) {
        b.instance(
          'blossoms',
          blossom,
          style === 'wheat' ? '#dfc583' : j % 3 ? colors[4] : '#f4dfab',
          [x + dx, top + 0.1 + height * 0.8, z + dz],
          [0.6, 0.65, 0.6],
          [0.1, rng() * 6, 0],
        );
        usedBlossom = true;
      }
    }
  }
  if (!usedLeaf) leaf.dispose();
  if (!usedBlossom) blossom.dispose();
}

function hangingGarden(b, color = b.colors[3]) {
  const { top, record, group } = b;
  for (const [i, a] of [0.55, 1.02, 2.3].entries()) {
    const [x, , z] = coastPoint(record, a, 1.03, top - 0.35);
    const length = 0.8 + i * 0.3;
    const vine = b.mark(group, 'hanging-vine', x, top - 0.35, z, 0.22, 0);
    b.branch(vine, color, [0, 0, 0], [0.06, -length, 0.05], 0.024);
    for (let j = 0; j < 5; j++) {
      const side = j % 2 ? 1 : -1;
      const leaf = mesh(
        vine,
        b.getGeometry('leaf', leafGeometry),
        color,
        [0.03, -0.12 - (j * length) / 6, 0.06],
        [0.25, 0.31, 0.25],
      );
      leaf.rotation.set(0, side * 0.9, side * 1.4);
    }
  }
}

function waterfall(b, color = '#8bc9cc') {
  const { top, group, record } = b;
  const [x, , z] = coastPoint(record, 0.67, 1.03, top - 0.34);
  const root = b.mark(group, 'cliff-cascade', x, top - 0.34, z, 0.62, 0);
  b.water(
    root,
    color,
    [
      [-0.12, 0, -0.13],
      [0.03, -0.3, 0.16],
      [-0.03, -0.95, 0.22],
      [0.12, -1.6, 0.16],
    ],
    0.54,
  );
  b.water(
    root,
    '#d8ece1',
    [
      [-0.09, -0.04, -0.11],
      [0.06, -0.32, 0.18],
      [0.0, -1.0, 0.245],
      [0.16, -1.57, 0.185],
    ],
    0.075,
  );
  for (let i = 0; i < 4; i++)
    b.rock(root, [-0.29 + i * 0.21, -1.6 + (i % 2) * 0.04, 0.17], [0.2, 0.09, 0.15], i % 3, [
      '#b5dad4',
      '#d9ebe0',
      '#eef2e2',
    ]);
}

function mushrooms(b, x, z, color = '#ce9c8c') {
  b.place('mushroom-log', x, z, 0.48, 0.65, (root) => {
    const log = cylinder(root, '#a78e70', [0, 0.12, 0], 0.14, 0.85, 7, 0.12);
    log.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const x = -0.22 + i * 0.2,
        h = 0.22 + (i % 2) * 0.13;
      cylinder(root, '#e6d8b6', [x, 0.2 + h / 2, 0.03], 0.035, h, 5);
      const cap = mesh(
        root,
        b.getGeometry('mushroom-cap', () => new ConeGeometry(1, 0.55, 7)),
        color,
        [x, 0.23 + h, 0.03],
        [0.18, 0.18, 0.18],
      );
      cap.rotation.z = (i - 1) * 0.15;
    }
    b.leaves(root, 0.35, 0.03, 0.13, 0.55);
  });
}

function urn(b, x, z, color = '#c49b7f', flowers = false) {
  b.place(flowers ? 'flower-urn' : 'clay-amphora', x, z, 0.34, 0.86, (root) => {
    const profile = [
      [0.15, 0],
      [0.24, 0.1],
      [0.27, 0.36],
      [0.13, 0.55],
      [0.11, 0.67],
      [0.16, 0.69],
    ];
    mesh(
      root,
      b.getGeometry(
        'urn',
        () =>
          new LatheGeometry(
            profile.map((p) => new Vector2(...p)),
            8,
          ),
      ),
      color,
    );
    for (const side of [-1, 1]) {
      const handle = mesh(
        root,
        b.getGeometry('urn-handle', () => new TorusGeometry(0.12, 0.03, 4, 8)),
        color,
        [side * 0.24, 0.4, 0],
        [0.65, 1, 1],
      );
      handle.rotation.y = side * 0.12;
    }
    if (flowers) {
      b.leaves(root, 0, 0.58, 0, 0.45);
      for (let i = 0; i < 3; i++)
        mesh(
          root,
          b.getGeometry('flower', flowerGeometry),
          i % 2 ? b.colors[4] : '#edcea1',
          [Math.cos(i * 2.1) * 0.14, 0.86 - i * 0.045, Math.sin(i * 2.1) * 0.13],
          [0.6, 0.6, 0.6],
        );
    }
  });
}

function reeds(b, x, z) {
  b.place('reed-clump', x, z, 0.3, 1.05, (root) => {
    b.leaves(root, 0, 0, 0, 0.73, '#86a77c', 5);
    for (let i = 0; i < 3; i++) {
      b.branch(
        root,
        '#98a47b',
        [(i - 1) * 0.13, 0, 0],
        [(i - 1) * 0.16, 0.8 + (i % 2) * 0.15, 0],
        0.02,
      );
      cylinder(root, '#b39572', [(i - 1) * 0.16, 0.84 + (i % 2) * 0.15, 0], 0.045, 0.2, 5);
    }
  });
}

function shellFan(b, parent, x, y, z, size = 0.5, color = '#ead7bd') {
  const vertices = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7 - 0.5) * Math.PI * 0.9,
      c = ((i + 1) / 7 - 0.5) * Math.PI * 0.9;
    vertices.push(
      x,
      y,
      z,
      x + Math.sin(a) * size,
      y + Math.cos(a) * size * 0.55,
      z - size * 0.3,
      x + Math.sin(c) * size,
      y + Math.cos(c) * size * 0.55,
      z - size * 0.3,
    );
    b.branch(
      parent,
      '#e8c2a8',
      [x, y + 0.015, z],
      [x + Math.sin(a) * size, y + Math.cos(a) * size * 0.55 + 0.015, z - size * 0.3],
      0.015,
    );
  }
  const object = mesh(parent, geometry(vertices), color);
  object.material = material(color); // Facets face upward toward the orthographic view.
}

function themeDetails(b) {
  const { top, group, colors } = b;
  switch (b.record.preset.id) {
    case 'S01':
      rimGarden(b);
      hangingGarden(b);
      mushrooms(b, -0.5, -3.75);
      mushrooms(b, 3.8, -1.75, '#d5b37f');
      b.place('fern-rock-garden', -3.7, -2.6, 0.52, 0.95, (root) => {
        b.rock(root, [0, 0.18, 0], [0.6, 0.46, 0.42], 1);
        b.leaves(root, 0.3, 0.15, 0.08, 0.8);
        b.leaves(root, -0.3, 0.12, 0.1, 0.52);
      });
      break;
    case 'S02':
      rimGarden(b, 'flowers');
      hangingGarden(b);
      urn(b, -3.8, -1.9, '#c28f82', true);
      urn(b, 3.55, -2.6, '#b792a2', true);
      b.place('garden-trellis', -0.1, -3.8, 0.75, 1.5, (root) => {
        for (const x of [-0.55, 0.55]) b.branch(root, '#b89e7c', [x, 0, 0], [x, 1.3, 0], 0.045);
        for (const y of [0.45, 0.9, 1.25])
          b.branch(root, '#c9b08a', [-0.66, y, 0], [0.66, y, 0], 0.035);
        for (let i = 0; i < 4; i++) {
          b.leaves(root, -0.48 + i * 0.3, 0.42 + (i % 2) * 0.44, 0.04, 0.4);
          mesh(
            root,
            b.getGeometry('flower', flowerGeometry),
            i % 2 ? '#dfb2c4' : '#eed6a6',
            [-0.48 + i * 0.3, 0.82 + (i % 2) * 0.44, 0.08],
            [0.65, 0.65, 0.65],
          );
        }
      });
      break;
    case 'S03':
      rimGarden(b, 'reeds');
      b.place('driftwood-and-shells', -0.7, -3.15, 0.65, 0.55, (root) => {
        b.branch(root, '#b7a58b', [-0.6, 0.09, -0.08], [0.5, 0.18, 0.09], 0.1);
        b.branch(root, '#c7b69a', [-0.15, 0.15, 0], [0.0, 0.4, -0.25], 0.06);
        shellFan(b, root, -0.33, 0.04, 0.29, 0.32);
        shellFan(b, root, 0.4, 0.04, 0.25, 0.2);
      });
      b.place('shale-shoulder', -3.7, -2.25, 0.56, 1.0, (root) => {
        for (let i = 0; i < 3; i++)
          b.rock(root, [i * 0.1, i * 0.24, 0], [0.6 - i * 0.1, 0.28, 0.4], i);
      });
      waterfall(b);
      break;
    case 'S04':
      rimGarden(b, 'reeds');
      hangingGarden(b);
      reeds(b, 3.7, -2.05);
      reeds(b, -0.8, -3.7);
      waterfall(b);
      b.place('lotus-bank', 2.45, -3.1, 0.45, 0.42, (root) => {
        b.rock(root, [0, 0.02, 0], [0.52, 0.15, 0.37], 2, ['#8cb5a6', '#aac6a4', '#bbce9d']);
        for (let i = 0; i < 3; i++)
          mesh(
            root,
            b.getGeometry('flower', flowerGeometry),
            '#e6bbcf',
            [-0.22 + i * 0.19, 0.15 + (i % 2) * 0.12, 0.08],
            [0.7, 0.9, 0.7],
          );
      });
      break;
    case 'S05':
      rimGarden(b);
      for (const [x, z, lean] of [
        [-3.6, -2.7, -0.2],
        [2.7, -3.35, 0.25],
        [-0.8, -3.7, -0.3],
      ])
        b.place('obsidian-outcrop', x, z, 0.45, 1.15, (root) => {
          for (let i = 0; i < 3; i++)
            b.gem(
              root,
              (i - 1) * 0.18,
              0,
              (i % 2) * 0.13,
              [0.7, 0.55 + i * 0.18, 0.55],
              i % 2 ? '#6c6579' : '#56596c',
              lean + i * 0.12,
            );
          b.rock(root, [0, 0.03, 0.2], [0.5, 0.16, 0.36], 1);
        });
      waterfall(b, '#dc9b72');
      for (let i = 0; i < 4; i++) {
        const x = 2.8 + i * 0.19,
          z = 2.7 - i * 0.05;
        b.water(
          group,
          '#dda07b',
          [
            [x, top - 0.6, z],
            [x + 0.1, top - 1.1, z - 0.1],
            [x + 0.05, top - 1.5, z - 0.25],
          ],
          0.045,
        );
      }
      break;
    case 'S06':
      rimGarden(b, 'flowers');
      b.place('wafer-grove', -0.65, -3.85, 0.65, 1.25, (root) => {
        for (let i = 0; i < 3; i++) {
          const wafer = box(
            root,
            i % 2 ? '#d5b08d' : '#e6c39b',
            [(i - 1) * 0.34, 0.5 + (i % 2) * 0.1, 0],
            [0.3, 1.0 + (i % 2) * 0.2, 0.17],
          );
          wafer.rotation.z = (i - 1) * -0.18;
          for (let j = 0; j < 4; j++)
            box(wafer, '#f5ddbd', [0, -0.38 + j * 0.24, 0.095], [0.32, 0.025, 0.02]);
        }
      });
      b.place('curled-candy-canes', -3.6, -2.2, 0.5, 1.4, (root) => {
        for (let i = 0; i < 2; i++) {
          cylinder(root, '#f4dfcb', [i * 0.38 - 0.2, 0.49, 0], 0.065, 0.98, 6);
          mesh(
            root,
            b.getGeometry('candy-hook', () => new TorusGeometry(0.19, 0.065, 5, 10, Math.PI)),
            '#d9a6ba',
            [i * 0.38 - 0.01, 0.98, 0],
          );
          for (let j = 0; j < 4; j++)
            cylinder(root, '#d9a6ba', [i * 0.38 - 0.2, 0.18 + j * 0.21, 0], 0.07, 0.06, 6);
        }
      });
      mushrooms(b, 3.65, -1.9, '#dfbad3');
      break;
    case 'S07':
      rimGarden(b);
      for (const [x, z] of [
        [-3.6, -2.6],
        [0.0, -3.75],
        [3.45, -2.2],
      ])
        b.place('ice-fractures', x, z, 0.42, 0.85, (root) => {
          for (let i = 0; i < 4; i++)
            b.gem(
              root,
              (i - 1.5) * 0.17,
              0,
              (i % 2) * 0.16,
              [0.6, 0.3 + (i % 3) * 0.18, 0.45],
              i % 2 ? '#cae5e3' : '#a4cbd8',
              (i - 1.5) * 0.18,
            );
        });
      for (let i = 0; i < 12; i++) {
        const a = 0.28 + i * 0.12;
        const [x, , z] = coastPoint(b.record, a, 1.03, top - 0.4);
        const h = 0.3 + (i % 4) * 0.14;
        const ice = mesh(
          group,
          b.getGeometry('icicle', () => new ConeGeometry(1, 1, 5)),
          '#c0e0e1',
          [x, top - 0.4 - h / 2, z],
          [0.09, h, 0.1],
        );
        ice.rotation.z = Math.PI;
      }
      break;
    case 'S08':
      rimGarden(b, 'wheat');
      hangingGarden(b);
      urn(b, -3.65, -2.0, '#c9ad80', true);
      b.place('meadow-stile', 0, -3.85, 0.85, 0.85, (root) => {
        for (const x of [-0.7, 0.0, 0.7]) b.branch(root, '#b69b75', [x, 0, 0], [x, 0.85, 0], 0.055);
        for (const y of [0.32, 0.67]) b.branch(root, '#d2bd92', [-0.8, y, 0], [0.8, y, 0], 0.045);
        b.leaves(root, -0.6, 0, 0.15, 0.45);
        b.leaves(root, 0.6, 0, 0.15, 0.65);
      });
      mushrooms(b, 3.7, -2.0, '#d7b58a');
      break;
    case 'S09':
      rimGarden(b, 'stars');
      hangingGarden(b, '#9e9fc0');
      mushrooms(b, -3.65, -2.1, '#c4b2d3');
      for (const [i, a] of [0.6, 1.7, 2.4].entries()) {
        const [x, , z] = coastPoint(b.record, a, 1.03, top - 0.7);
        const root = b.mark(group, 'suspended-moonstone', x, top - 0.7, z, 0.2, 0);
        b.gem(root, 0, -0.3 - i * 0.1, 0, [0.7, 0.7, 0.6], i % 2 ? '#cbb6d2' : '#a9c6d1', Math.PI);
      }
      urn(b, 3.55, -2.3, '#9999b8', true);
      break;
    case 'S10':
      rimGarden(b);
      for (const [x, z] of [
        [-3.75, -2.35],
        [-0.4, -3.75],
        [3.5, -2.55],
      ])
        b.place('sandstone-fins', x, z, 0.55, 0.9, (root) => {
          for (let i = 0; i < 3; i++) {
            const object = b.rock(root, [(i - 1) * 0.18, 0.2 + i * 0.12, 0], [0.52, 0.27, 0.26], i);
            object.rotation.z = -0.2;
          }
        });
      urn(b, -3.65, -2.55, '#c89e7c');
      urn(b, 3.4, -1.9, '#b7a481');
      b.place('agave-rosette', 0.4, -3.75, 0.4, 0.8, (root) =>
        b.leaves(root, 0, 0, 0, 0.8, '#92ac8b', 9),
      );
      break;
    case 'S11':
      rimGarden(b, 'flowers');
      hangingGarden(b, '#b7c3a1');
      waterfall(b, '#a0d5db');
      b.place('cloud-stone-terraces', -0.1, -3.5, 0.72, 0.85, (root) => {
        for (let i = 0; i < 3; i++)
          b.rock(root, [i * 0.18, i * 0.18, 0], [0.7 - i * 0.12, 0.23, 0.43], i, [
            '#bed1d7',
            '#dce6dd',
            '#f4f1df',
          ]);
        b.leaves(root, -0.5, 0.12, 0.1, 0.6, '#b2caa7');
      });
      urn(b, 3.45, -2.05, '#d4d1bd', true);
      break;
    case 'S12':
      rimGarden(b, 'flowers');
      hangingGarden(b);
      waterfall(b);
      urn(b, -3.75, -1.9, '#cda88b', true);
      urn(b, 3.55, -2.5, '#c09cae', true);
      b.place('festival-bunting', -0.1, -3.8, 1.05, 1.65, (root) => {
        for (const x of [-0.94, 0.94]) b.branch(root, '#c2a381', [x, 0, 0], [x, 1.65, 0], 0.04);
        for (let i = 0; i < 6; i++) {
          const x = -0.94 + i * 0.313,
            nx = x + 0.313;
          const y = 1.58 - Math.sin((i / 6) * Math.PI) * 0.2,
            ny = 1.58 - Math.sin(((i + 1) / 6) * Math.PI) * 0.2;
          b.branch(root, '#d6c39d', [x, y, 0], [nx, ny, 0], 0.014);
          mesh(
            root,
            geometry([
              x + 0.035,
              y - 0.02,
              0.02,
              (x + nx) / 2,
              Math.min(y, ny) - 0.26,
              0.025,
              nx - 0.035,
              ny - 0.02,
              0.02,
            ]),
            ['#d9a3af', '#a5c4b5', '#e3c48b'][i % 3],
          );
        }
      });
      break;
    case 'S13':
      rimGarden(b);
      hangingGarden(b);
      reeds(b, 3.6, -2.65);
      mushrooms(b, -0.4, -3.85, '#bd997d');
      b.place('bamboo-water-spout', 3.65, -1.7, 0.48, 1.1, (root) => {
        b.rock(root, [0, 0.07, 0.14], [0.47, 0.25, 0.4], 1);
        const basin = mesh(
          root,
          b.getGeometry('basin', () => new TorusGeometry(0.3, 0.09, 5, 12)),
          '#b6b59a',
          [0, 0.2, 0.14],
        );
        basin.rotation.x = -Math.PI / 2;
        cylinder(root, '#81afa9', [0, 0.2, 0.14], 0.25, 0.025, 12);
        b.branch(root, '#9aaf7d', [0, 0, -0.18], [0, 1.04, -0.18], 0.065);
        b.branch(root, '#b5bf8c', [0, 0.83, -0.18], [0, 0.67, 0.18], 0.07);
        b.water(
          root,
          '#b3dad2',
          [
            [0, 0.67, 0.2],
            [0.015, 0.25, 0.21],
          ],
          0.035,
        );
      });
      break;
    case 'S14':
      rimGarden(b, 'stars');
      for (const [i, a] of [0.35, 0.9, 1.65, 2.35].entries()) {
        const [x, , z] = coastPoint(b.record, a, 1.03, top - 0.6);
        const root = b.mark(group, 'exposed-crystal-vein', x, top - 0.6, z, 0.4, 0);
        for (let j = 0; j < 3; j++)
          b.gem(
            root,
            j * 0.13 - 0.12,
            -j * 0.17,
            0,
            [0.8, 0.4 + j * 0.16, 0.7],
            ['#b8a0cd', '#9cc5cf', '#d3aac3'][j],
            0.8 + i * 0.24,
          );
      }
      b.place('ore-handcart', -3.45, -3.2, 0.45, 0.65, (root) => {
        const tray = box(root, '#b5a8ae', [0, 0.27, 0], [0.65, 0.12, 0.42]);
        tray.rotation.z = -0.08;
        for (const x of [-0.3, 0.3]) {
          const wheel = mesh(
            root,
            b.getGeometry('cart-wheel', () => new TorusGeometry(0.16, 0.035, 4, 10)),
            '#8e899b',
            [x, 0.15, 0.12],
          );
          wheel.rotation.y = Math.PI / 2;
        }
        for (let i = 0; i < 3; i++)
          b.gem(
            root,
            -0.2 + i * 0.18,
            0.28,
            0,
            [0.5, 0.28, 0.5],
            ['#bca4cd', '#a7c6d2', '#cdaebd'][i],
            i * 0.3,
          );
        b.branch(root, '#b2a1aa', [0, 0.3, -0.1], [0, 0.42, -0.65], 0.035);
      });
      break;
    case 'S15':
      rimGarden(b);
      hangingGarden(b, '#83b3ab');
      waterfall(b, '#a0d4cc');
      for (const [x, z, color] of [
        [-3.65, -2.35, '#d8a9bd'],
        [-0.5, -3.8, '#c4afce'],
        [3.45, -2.25, '#e4bc9e'],
      ])
        b.place('branching-fan-coral', x, z, 0.5, 1.2, (root) => {
          b.branch(root, color, [0, 0, 0], [0, 0.8, 0], 0.06);
          for (let i = 0; i < 5; i++) {
            const a = (i - 2) * 0.37,
              end = [Math.sin(a) * 0.53, 0.55 + Math.cos(a) * 0.6, 0];
            b.branch(root, color, [0, 0.35, 0], end, 0.035);
            b.branch(
              root,
              color,
              [end[0] * 0.8, end[1] * 0.85, 0],
              [end[0] + 0.13, end[1] + 0.04, 0.06],
              0.022,
            );
          }
          shellFan(b, root, -0.16, 0.05, 0.2, 0.3);
          b.leaves(root, 0.25, 0, -0.12, 0.8, '#91bbaa');
        });
      break;
  }
}

export function addIslandDressing(record) {
  if (!record?.root?.isGroup || !record.terrain?.isMesh || !PALETTES[record.preset?.id])
    throw new TypeError('Island dressing requires a constructed S01–S15 record');
  const existing = record.root.getObjectByName('themed-dressing');
  if (existing)
    return {
      group: existing,
      count: existing.userData.dressingCount,
      placements: existing.userData.placements,
    };
  const b = builder(record);
  shoreline(b);
  themeDetails(b);
  return b.finish();
}
