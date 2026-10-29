import { Box3, Group, Raycaster, Vector3 } from 'three';
import { animateShark } from './animals.js';
import { createCreature } from './creatures.js';
import { ball, box, cone, cylinder, material } from './primitives.js';
import { disposeScene } from './optimize.js';

const SPECIES = [
  'shark',
  'fish',
  'penguin',
  'jellyfish',
  'dinosaur',
  'sheep',
  'arctic-fox',
  'duck',
  'butterfly',
  'camel',
  'whale',
  'flamingo',
  'panda',
  'crystal',
  'turtle',
];
const COLORS = {
  shark: ['#639dbb', '#87bfc7', '#989cc7'],
  fish: ['#75bcb8', '#e3a079', '#b5a2cc'],
  penguin: ['#536b7b', '#6c8393', '#7a7b98'],
  jellyfish: ['#b8c6dc', '#e3b6cd', '#a9d4c5'],
  dinosaur: ['#85b5a1', '#a7bd7d', '#b5a2c8'],
  sheep: ['#fff0de', '#f0d1df', '#f4e4ac'],
  'arctic-fox': ['#f1f3e8', '#d7e8ee', '#e5dff0'],
  duck: ['#f0d587', '#e8e7ce', '#c3d4a4'],
  butterfly: ['#c0a1db', '#eccb84', '#8fd3ce'],
  camel: ['#d0aa79', '#e1bf8e', '#bf9778'],
  whale: ['#91b4d1', '#a0a7d2', '#7fbdc7'],
  flamingo: ['#e6a0b0', '#efb7bb', '#d88ba8'],
  panda: ['#c59373', '#d3a382', '#b68476'],
  crystal: ['#a9cbd7', '#d7acd6', '#b6d1a0'],
  turtle: ['#78aaa0', '#8db58d', '#85b4bf'],
};
const FLOATING = new Set(['fish', 'jellyfish', 'duck', 'butterfly', 'whale', 'crystal', 'turtle']);
const HOPPING = new Set(['shark', 'dinosaur', 'sheep', 'camel']);
const previousFauna = new WeakMap();
const glowingMaterials = new Map();
const up = new Vector3(0, 1, 0);

function glow(color) {
  if (!glowingMaterials.has(color)) {
    const result = material(color).clone();
    result.emissive.set(color);
    result.emissiveIntensity = 0.24;
    result.userData.shared = true;
    glowingMaterials.set(color, result);
  }
  return glowingMaterials.get(color);
}

function pivot(parent, name, position = [0, 0, 0], parts = []) {
  const group = new Group();
  group.name = name;
  group.position.set(...position);
  group.userData.animated = true;
  parent.add(group);
  for (const part of parts) {
    part.position.sub(group.position);
    group.add(part);
  }
  return group;
}

function eyes(parent, y, z, spread = 0.13) {
  for (const side of [-1, 1]) {
    ball(parent, '#304a56', [side * spread, y, z], [0.045, 0.058, 0.033], 7);
    ball(parent, '#ffffff', [side * spread + 0.012, y + 0.02, z + 0.025], [0.013, 0.016, 0.01], 6);
  }
}

function link(parent, color, from, to, radius = 0.06) {
  const a = new Vector3(...from),
    b = new Vector3(...to),
    direction = b.clone().sub(a);
  const part = cylinder(
    parent,
    color,
    a.clone().lerp(b, 0.5).toArray(),
    radius,
    direction.length(),
    7,
  );
  part.quaternion.setFromUnitVectors(up, direction.normalize());
  return part;
}

// Diagonal pairs keep four recognizable legs while using only two moving frames.
function walkingLegs(parent, color, height, width, length) {
  return [0, 1].map((pair) => {
    const legs = pivot(parent, `leg-pair-${pair}`, [0, height, 0]);
    for (const side of [-1, 1]) {
      const z = side * (pair ? -1 : 1) * length;
      cylinder(legs, color, [side * width, -height * 0.5, z], 0.07, height, 7);
      ball(legs, color, [side * width, -height + 0.04, z + 0.035], [0.1, 0.065, 0.13], 7);
    }
    return legs;
  });
}

function fox(color) {
  const group = new Group();
  ball(group, color, [0, 0.48, 0], [0.32, 0.29, 0.52]);
  ball(group, '#f8f3e7', [0, 0.53, 0.32], [0.27, 0.3, 0.23]);
  ball(group, color, [0, 0.84, 0.43], [0.3, 0.28, 0.28]);
  for (const side of [-1, 1]) {
    const ear = cone(group, color, [side * 0.19, 1.13, 0.4], 0.14, 0.37, 4);
    ear.rotation.z = -side * 0.15;
    cone(group, '#d2b9c7', [side * 0.19, 1.14, 0.47], 0.075, 0.22, 4);
  }
  ball(group, '#faf4e6', [0, 0.77, 0.68], [0.21, 0.14, 0.23]);
  ball(group, '#4e5863', [0, 0.8, 0.87], [0.065, 0.05, 0.045]);
  eyes(group, 0.88, 0.66, 0.14);
  const legs = walkingLegs(group, '#b4c4cd', 0.27, 0.21, 0.3);
  const tail = pivot(group, 'bushy-tail', [0, 0.45, -0.4]);
  ball(tail, color, [0.12, 0.16, -0.35], [0.23, 0.24, 0.48]);
  ball(tail, '#fff6e7', [0.16, 0.22, -0.67], [0.18, 0.19, 0.23]);
  return {
    group,
    animate(t) {
      legs.forEach((part, i) => {
        part.rotation.x = Math.sin(t * 3.2 + i * Math.PI) * 0.19;
      });
      tail.rotation.y = Math.sin(t * 1.8) * 0.25;
    },
  };
}

function duck(color) {
  const group = new Group();
  ball(group, color, [0, 0.4, 0], [0.42, 0.34, 0.58]);
  ball(group, color, [0, 0.86, 0.35], [0.29, 0.3, 0.28]);
  ball(group, '#f8e9bc', [0, 0.64, 0.36], [0.24, 0.25, 0.18]);
  box(group, '#dca05e', [0, 0.79, 0.64], [0.36, 0.1, 0.32]);
  eyes(group, 0.93, 0.57, 0.15);
  for (const side of [-1, 1]) {
    ball(group, '#dba261', [side * 0.17, 0.09, 0.04], [0.15, 0.055, 0.24]);
    const feather = cone(group, color, [side * 0.09, 0.5, -0.52], 0.12, 0.35, 5);
    feather.rotation.x = -0.8;
  }
  const wings = [-1, 1].map((side) => {
    const wing = pivot(group, `wing-${side}`, [side * 0.34, 0.5, 0]);
    ball(wing, '#f6e5b6', [side * 0.12, 0, -0.04], [0.24, 0.09, 0.34]);
    return wing;
  });
  return {
    group,
    animate(t) {
      wings.forEach((wing, i) => {
        wing.rotation.z = (i ? 1 : -1) * (0.1 + Math.sin(t * 4.7) * 0.32);
      });
    },
  };
}

function camel(color) {
  const group = new Group();
  ball(group, color, [0, 0.65, -0.05], [0.34, 0.32, 0.63]);
  for (const z of [-0.32, 0.15]) ball(group, color, [0, 0.93, z], [0.27, 0.36, 0.25]);
  link(group, color, [0, 0.69, 0.4], [0, 1.4, 0.58], 0.16);
  ball(group, color, [0, 1.5, 0.58], [0.23, 0.22, 0.29]);
  ball(group, '#ecd1a2', [0, 1.4, 0.83], [0.21, 0.14, 0.21]);
  for (const side of [-1, 1]) {
    const ear = ball(group, color, [side * 0.21, 1.69, 0.51], [0.09, 0.17, 0.065]);
    ear.rotation.z = -side * 0.4;
  }
  eyes(group, 1.54, 0.79, 0.13);
  const legs = walkingLegs(group, '#af896d', 0.44, 0.23, 0.37);
  const tail = pivot(group, 'camel-tail', [0, 0.71, -0.62]);
  link(tail, color, [0, 0, 0], [0.03, -0.32, -0.12], 0.035);
  ball(tail, '#9c775f', [0.03, -0.35, -0.12], [0.07, 0.1, 0.065], 7);
  return {
    group,
    animate(t) {
      legs.forEach((part, i) => {
        part.rotation.x = Math.sin(t * 3.1 + i * Math.PI) * 0.22;
      });
      tail.rotation.z = Math.sin(t * 2.2) * 0.25;
    },
  };
}

function whale(color) {
  const group = new Group();
  ball(group, color, [0, 0.45, 0], [0.76, 0.43, 0.4], 12);
  ball(group, color, [0.43, 0.48, 0], [0.48, 0.37, 0.39]);
  ball(group, '#e8efe0', [0.12, 0.22, 0], [0.64, 0.18, 0.33]);
  for (const side of [-1, 1]) {
    ball(group, '#344e65', [0.52, 0.51, side * 0.35], [0.052, 0.067, 0.03]);
    ball(group, '#ffffff', [0.54, 0.53, side * 0.375], [0.016, 0.02, 0.01], 6);
    const flipper = ball(group, color, [0, 0.27, side * 0.43], [0.28, 0.075, 0.24]);
    flipper.rotation.x = side * 0.18;
  }
  ball(group, '#4b7494', [0.29, 0.85, 0], [0.08, 0.018, 0.04], 7);
  const tail = pivot(group, 'whale-flukes', [-0.7, 0.45, 0]);
  ball(tail, color, [-0.14, 0, 0], [0.28, 0.18, 0.18]);
  for (const side of [-1, 1]) {
    const fluke = ball(tail, color, [-0.36, 0, side * 0.21], [0.26, 0.07, 0.3]);
    fluke.rotation.y = side * 0.55;
  }
  return {
    group,
    animate(t) {
      tail.rotation.z = Math.sin(t * 3.6) * 0.25;
    },
  };
}

function flamingo(color) {
  const group = new Group();
  ball(group, color, [0, 0.95, 0], [0.32, 0.29, 0.45]);
  const neck = [
    [0, 1.08, 0.25],
    [0, 1.4, 0.43],
    [0, 1.67, 0.31],
    [0, 1.81, 0.48],
  ];
  for (let i = 1; i < neck.length; i++) {
    link(group, color, neck[i - 1], neck[i], 0.065);
    ball(group, color, neck[i], [0.072, 0.075, 0.072], 7);
  }
  ball(group, color, [0, 1.84, 0.56], [0.18, 0.19, 0.2]);
  ball(group, '#efdbb9', [0, 1.77, 0.75], [0.11, 0.09, 0.18]);
  ball(group, '#505668', [0, 1.73, 0.88], [0.085, 0.09, 0.09]);
  eyes(group, 1.88, 0.72, 0.1);
  const legs = [-1, 1].map((side) => {
    const leg = pivot(group, `dancing-leg-${side}`, [side * 0.13, 0.88, 0]);
    link(leg, '#c78b8d', [0, 0, 0], [0, -0.42, -0.04], 0.026);
    link(leg, '#c78b8d', [0, -0.42, -0.04], [0, -0.82, 0.08], 0.024);
    ball(leg, '#d9aa8e', [0, -0.84, 0.17], [0.11, 0.025, 0.18], 7);
    return leg;
  });
  for (const side of [-1, 1]) {
    const wing = ball(group, '#efb4bd', [side * 0.27, 1.0, -0.03], [0.09, 0.18, 0.32]);
    wing.rotation.y = side * 0.2;
  }
  return {
    group,
    animate(t) {
      legs.forEach((leg, i) => {
        leg.rotation.x = Math.max(0, Math.sin(t * 2.8 + i * Math.PI)) * -0.65;
      });
    },
  };
}

function recolor(group, kind, color) {
  const affected =
    {
      shark: ['#639dbb', '#80b4c7', '#548aa9', '#518ba8', '#548eab'],
      penguin: ['#536b7b', '#50697b', '#607b88'],
      sheep: ['#fff0de', '#f2dfe0'],
      panda: ['#c59373', '#b87f61'],
      turtle: ['#78aaa0', '#90b27f'],
    }[kind] ?? [];
  group.traverse((part) => {
    if (part.isMesh && affected.includes(`#${part.material.color.getHexString()}`))
      part.material = material(color);
  });
}

function familiarAnimal(kind, color) {
  const group = createCreature(kind, color),
    motions = [];
  recolor(group, kind, color);
  if (kind === 'fish' || kind === 'dinosaur') {
    const tail = group.children.find(
      (part) =>
        part.geometry?.type === 'ConeGeometry' &&
        (kind === 'fish' ? part.position.x < -0.5 : part.position.z < -0.5),
    );
    if (tail) {
      tail.userData.animated = true;
      motions.push((t) => {
        tail.rotation.y = Math.sin(t * 5.7) * 0.35;
      });
    }
  } else if (kind === 'penguin') {
    const feet = group.children.filter((part) => Math.abs(part.position.y - 0.055) < 0.001);
    feet.forEach((foot, i) => {
      foot.userData.animated = true;
      motions.push((t) => {
        foot.position.z = 0.15 + Math.sin(t * 3.6 + i * Math.PI) * 0.09;
      });
    });
  } else if (kind === 'jellyfish') {
    const tentacles = group.children.filter((part) => part.geometry?.type === 'TorusGeometry');
    const skirt = pivot(group, 'tentacle-skirt', [0, 0.7, 0], tentacles);
    motions.push((t) => {
      skirt.rotation.z = Math.sin(t * 2.1) * 0.16;
      skirt.scale.y = 1 + Math.sin(t * 2.4) * 0.16;
    });
  } else if (kind === 'sheep') {
    const tail = pivot(group, 'cotton-tail', [0, 0.59, -0.42]);
    ball(tail, color, [0, 0, -0.09], [0.15, 0.17, 0.2]);
    motions.push((t) => {
      tail.rotation.x = Math.sin(t * 4.1) * 0.3;
    });
  } else if (kind === 'butterfly') {
    for (const side of [-1, 1]) {
      const pieces = group.children.filter((part) => part.isMesh && part.position.x * side > 0.16);
      const wing = pivot(group, `glowing-wing-${side}`, [0, 0.4, 0], pieces);
      pieces.forEach((part) => {
        part.material = glow(`#${part.material.color.getHexString()}`);
      });
      ball(wing, '#fff1cc', [side * 0.34, 0.16, 0.065], [0.07, 0.07, 0.025], 6);
      motions.push((t) => {
        wing.rotation.y = side * (0.2 + Math.sin(t * 8.2) * 0.64);
      });
    }
    for (const side of [-1, 1])
      link(group, '#786f8c', [side * 0.025, 0.62, 0], [side * 0.12, 0.85, 0], 0.014);
  } else if (kind === 'panda') {
    const tail = pivot(group, 'striped-tail', [0.23, 0.3, -0.3], group.children.slice(-5));
    motions.push((t) => {
      tail.rotation.y = Math.sin(t * 1.8) * 0.25;
    });
  } else if (kind === 'crystal') {
    const ring = group.children[0];
    ring.userData.animated = true;
    motions.push((t) => {
      ring.rotation.set(0.4, t * 0.5, Math.sin(t * 1.4) * 0.16);
    });
  } else if (kind === 'turtle') {
    const flippers = group.children.filter(
      (part) => Math.abs(Math.abs(part.position.x) - 0.47) < 0.001,
    );
    flippers.forEach((flipper) => {
      flipper.userData.animated = true;
      motions.push((t) => {
        const side = Math.sign(flipper.position.x),
          phase = flipper.position.z > 0 ? 0 : Math.PI * 0.75;
        flipper.rotation.z = side * Math.sin(t * 2.1 + phase) * 0.32;
        flipper.rotation.y = side * flipper.position.z + Math.cos(t * 2.1 + phase) * 0.1;
      });
    });
  }
  return {
    group,
    animate(t) {
      motions.forEach((update) => update(t));
    },
  };
}

function model(kind, color) {
  const build = { 'arctic-fox': fox, duck, camel, whale, flamingo }[kind];
  return build ? build(color) : familiarAnimal(kind, color);
}

// Only authored land masses support animals. Trees, the cottage, props and dressing
// are deliberately excluded so a passing fox cannot climb a lantern or a shrub.
function supportSampler(record, x, z, rx, rz) {
  const root = record.root,
    top = record.top ?? 0.8,
    candidates = [];
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    size = new Vector3();
  root.traverse((object) => {
    if (!object.isMesh) return;
    for (let p = object; p && p !== root; p = p.parent)
      if (p === record.house || p.userData.animated || p.name === 'themed-dressing') return;
    const type = object.geometry.type;
    if (
      object !== record.terrain &&
      object.name !== 'coast-and-cliffs' &&
      !['SphereGeometry', 'ConeGeometry', 'LatheGeometry'].includes(type)
    )
      return;
    const bounds = new Box3().setFromObject(object).applyMatrix4(inverse);
    bounds.getSize(size);
    if (
      object === record.terrain ||
      object.name === 'coast-and-cliffs' ||
      (size.x > 1.1 && size.z > 1.1 && size.y > 0.35 && bounds.min.y <= top + 0.3)
    )
      candidates.push(object);
  });
  const ray = new Raycaster(),
    down = new Vector3(0, -1, 0),
    values = [],
    steps = 6;
  const lowX = x - rx,
    lowZ = z - rz;
  for (let iz = 0; iz <= steps; iz++) {
    const row = [];
    for (let ix = 0; ix <= steps; ix++) {
      const origin = root.localToWorld(
        new Vector3(lowX + (ix * rx * 2) / steps, 40, lowZ + (iz * rz * 2) / steps),
      );
      ray.set(origin, down);
      const hit = ray.intersectObjects(candidates, false)[0];
      row.push(hit ? Math.max(top + 0.05, root.worldToLocal(hit.point.clone()).y) : top + 0.16);
    }
    values.push(row);
  }
  return (px, pz) => {
    const gx = Math.max(0, Math.min(steps - 0.000001, ((px - lowX) / (rx * 2)) * steps));
    const gz = Math.max(0, Math.min(steps - 0.000001, ((pz - lowZ) / (rz * 2)) * steps));
    const ix = Math.floor(gx),
      iz = Math.floor(gz),
      dx = gx - ix,
      dz = gz - iz;
    return (
      (values[iz][ix] * (1 - dx) + values[iz][ix + 1] * dx) * (1 - dz) +
      (values[iz + 1][ix] * (1 - dx) + values[iz + 1][ix + 1] * dx) * dz
    );
  };
}

function animalMotion(record, kind, index, number) {
  const { group, animate } = model(kind, COLORS[kind][index]);
  const [x, z] =
    kind === 'duck' && index === 2
      ? [-0.15, -0.85]
      : [
          [0.35, 0.3],
          [1.85, -0.4],
          [0.12, -1.27],
        ][index];
  const rx = 0.15 + index * 0.015,
    rz = 0.105;
  const heightAt = supportSampler(record, x, z, rx, rz);
  const size = (kind === 'shark' ? [0.75, 0.57, 0.62] : [0.74, 0.61, 0.66])[index];
  const phase = number * 0.83 + index * 2.37,
    speed = 0.35 + index * 0.047;
  group.name = `decorative-${kind}-${index + 1}`;
  group.userData.decoration = true;
  group.userData.animated = true;
  group.userData.species = kind;
  group.userData.individual = index + 1;
  group.scale.setScalar(size);
  const motion = {
    group,
    kind,
    update(seconds) {
      const t = (Number.isFinite(seconds) ? seconds : 0) + phase,
        walk = t * speed;
      const px = x + Math.sin(walk) * rx,
        pz = z + Math.cos(walk * 0.87) * rz;
      const beat = Math.sin(t * (2.65 + index * 0.19));
      const hop = HOPPING.has(kind) ? Math.max(0, beat) : 0;
      const float = FLOATING.has(kind)
        ? (kind === 'butterfly' ? 0.95 : kind === 'jellyfish' ? 0.6 : 0.72) +
          Math.sin(t * (1.35 + index * 0.12)) * 0.13
        : 0;
      group.position.set(
        px,
        heightAt(px, pz) + 0.08 + float + hop * (kind === 'camel' ? 0.26 : 0.36),
        pz,
      );
      group.rotation.set(
        FLOATING.has(kind) ? Math.sin(t * 1.3) * 0.035 : 0,
        Math.sin(walk) * 0.42 +
          (index - 1) * 0.3 +
          (kind === 'flamingo' ? Math.sin(t * 1.4) * 0.2 : 0),
        Math.sin(t * (kind === 'butterfly' ? 1.8 : 2.7)) * (FLOATING.has(kind) ? 0.07 : 0.045),
      );
      const stretch = 1 + hop * 0.055;
      group.scale.set(size / Math.sqrt(stretch), size * stretch, size / Math.sqrt(stretch));
      animate(t);
    },
  };
  record.root.add(group);
  motion.update(0);
  return motion;
}

// The public contract contains only independent animal descriptors. Core owns
// aggregation, animation frequency, picking and the rest of the scene lifecycle.
export function createIslandFauna(record) {
  const number = Number(record.preset?.id?.slice(1)),
    kind = SPECIES[number - 1];
  if (!kind || !record.root?.isGroup) throw new Error('Fauna requires an S01–S15 island record');
  const original = number === 1 ? record.animals?.[0] : null;
  if (number === 1 && !original) throw new Error('S01 fauna requires its original shark');
  const removed = new Set([
    ...(record.creatures ?? []).map((motion) => motion.group),
    ...(record.animals ?? []),
    ...(previousFauna.get(record.root) ?? []).map((motion) => motion.group),
  ]);
  removed.delete(original);
  for (const group of removed) {
    group.removeFromParent();
    disposeScene(group);
  }
  const motions = [];
  if (original) {
    original.userData.decoration = true;
    original.userData.animated = true;
    original.userData.species = 'shark';
    original.userData.individual = 1;
    record.root.add(original);
    motions.push({
      group: original,
      kind,
      update(seconds) {
        animateShark(original, Number.isFinite(seconds) ? seconds : 0);
      },
    });
    motions[0].update(0);
  }
  for (let index = motions.length; index < 3; index++)
    motions.push(animalMotion(record, kind, index, number));
  previousFauna.set(record.root, motions);
  return motions;
}
