import { Group, MeshStandardMaterial, TorusGeometry, Vector3 } from 'three';
import { addPond, addWaterfall } from '../props.js';
import { ball, box, cylinder, mesh } from '../primitives.js';
import { createIslandShell, addAnimal, crystal, mound } from './shared.js';

const up = new Vector3(0, 1, 0);

function branch(parent, color, from, to, radius = 0.07) {
  const a = new Vector3(...from),
    b = new Vector3(...to);
  const direction = b.clone().sub(a);
  const wood = cylinder(
    parent,
    color,
    a.clone().lerp(b, 0.5).toArray(),
    radius,
    direction.length(),
    6,
    radius * 0.72,
  );
  wood.quaternion.setFromUnitVectors(up, direction.normalize());
  return wood;
}

function bamboo(parent, x, y, z, height, lean, movingCrown = false) {
  const stalk = new Group();
  stalk.position.set(x, y, z);
  stalk.rotation.z = lean;
  parent.add(stalk);
  cylinder(stalk, '#789a73', [0, height / 2, 0], 0.075, height, 7, 0.055);
  for (let joint = 0.45; joint < height - 0.15; joint += 0.66) {
    cylinder(stalk, '#bec79a', [0, joint, 0], 0.09, 0.055, 7);
  }
  const crown = new Group();
  crown.position.y = height * 0.72;
  crown.userData.animated = movingCrown;
  stalk.add(crown);
  for (const side of [-1, 1]) {
    branch(crown, '#819e74', [0, 0, 0], [side * 0.43, 0.3, 0.02], 0.025);
    for (let i = 0; i < 3; i++) {
      const leaf = ball(
        crown,
        '#8caf7c',
        [side * (0.21 + i * 0.13), 0.14 + i * 0.08, 0.03],
        [0.27, 0.06, 0.12],
        7,
      );
      leaf.rotation.z = side * (0.18 + i * 0.14);
    }
  }
  return crown;
}

function fanCoral(parent, x, y, z, color, scale, angle) {
  const fan = new Group();
  fan.position.set(x, y, z);
  fan.rotation.y = angle;
  fan.scale.setScalar(scale);
  parent.add(fan);
  branch(fan, color, [0, 0, 0], [0.05, 1.25, 0], 0.11);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.33;
    const end = [Math.sin(a) * 0.94, 1.12 + Math.cos(a) * 0.83, 0];
    branch(fan, color, [0, 0.72, 0], end, 0.055);
    ball(fan, color, end, [0.09, 0.11, 0.08], 7);
    if (i % 2 === 0) {
      branch(
        fan,
        color,
        [end[0] * 0.65, end[1] * 0.82, 0],
        [end[0] + 0.17, end[1] - 0.11, 0],
        0.035,
      );
    }
  }
  return fan;
}

function bambooIsland(record) {
  const { landmarks, house, top, animate } = record;
  // A sloping rocky shoulder and irregular bamboo bands make a tall, narrow silhouette.
  mound(landmarks, 2.7, top + 0.4, -2.1, [1.18, 1.2, 0.95], '#99a899');
  mound(landmarks, 1.1, top + 0.25, -2.8, [1.15, 0.7, 0.7], '#aeb79e');
  for (let i = 0; i < 17; i++) {
    const column = i % 6,
      row = Math.floor(i / 6);
    const x = -3.45 + column * 1.18 + Math.sin(i * 1.7) * 0.18;
    const z = -2.75 + row * 0.56 + Math.cos(i * 2.3) * 0.15;
    const elevated = x > 1.7 ? 0.52 : 0;
    const crown = bamboo(
      landmarks,
      x,
      top + 0.07 + elevated,
      z,
      2.0 + (i % 4) * 0.33,
      Math.sin(i) * 0.055,
      i === 3 || i === 12,
    );
    if (crown.userData.animated)
      animate.push((seconds) => {
        crown.rotation.z = Math.sin(seconds * 0.8 + i) * 0.055;
      });
  }
  addPond(landmarks, 3.35, top + 0.15, -1.15, 0.68);
  for (let i = 0; i < 7; i++) {
    ball(
      landmarks,
      '#82c5bb',
      [3.6 + Math.sin(i * 0.23) * 0.5, top + 0.15, -0.8 + i * 0.31],
      [0.29, 0.035, 0.28],
      9,
    );
  }
  addWaterfall(landmarks, 4.2, 1.4, top + 0.1, -2.3, 0.48);
  for (let i = 0; i < 3; i++) {
    const foam = ball(landmarks, '#deeee0', [3.8, top + 0.2, 0], [0.08, 0.015, 0.13], 6);
    foam.userData.animated = true;
    animate.push((seconds) => {
      const travel = (seconds * 0.27 + i / 3) % 1;
      foam.position.set(3.6 + Math.sin(travel * 1.6) * 0.5, top + 0.2, -0.8 + travel * 1.86);
    });
  }
  // Bamboo rafters and a warm hanging lantern distinguish the cottage without covering its face.
  for (const x of [-0.72, 0.72])
    branch(house, '#7e9a77', [x, 1.65, -0.7], [x * 0.45, 2.42, 0], 0.06);
  cylinder(house, '#9e8565', [-0.98, 1.35, 0.8], 0.022, 0.38, 6);
  ball(house, '#efd391', [-0.98, 1.1, 0.8], [0.14, 0.19, 0.14], 8);

  const animal = addAnimal(record, 'panda', '#b58a70');
  const panda = animal.group;
  const tail = new Group();
  tail.position.set(0.23, 0.3, -0.3);
  tail.userData.animated = true;
  for (const part of panda.children.slice(-5)) {
    part.position.sub(tail.position);
    tail.add(part);
  }
  panda.add(tail);
  const feet = panda.children.filter(
    (part) =>
      Math.abs(part.position.y - 0.13) < 0.001 &&
      Math.abs(Math.abs(part.position.x) - 0.25) < 0.001,
  );
  feet.forEach((foot) => {
    foot.userData.animated = true;
  });
  branch(panda, '#88a77a', [-0.17, 0.45, 0.45], [0.19, 0.93, 0.48], 0.025);
  ball(panda, '#a6bc89', [0.13, 0.88, 0.47], [0.17, 0.045, 0.08], 7).rotation.z = 0.6;
  animal.update = (seconds) => {
    const t = seconds + 13 * 1.37;
    panda.position.set(
      0.48 + Math.sin(t * 0.45) * 0.45,
      top + 0.3 + Math.abs(Math.sin(t * 2.5)) * 0.05,
      0.25 + Math.cos(t * 0.45) * 0.22,
    );
    panda.rotation.set(0, Math.sin(t * 0.45) * 0.38, Math.sin(t * 2.5) * 0.055);
    feet.forEach((foot, i) => {
      foot.position.y = 0.13 + Math.max(0, Math.sin(t * 2.5 + i * Math.PI)) * 0.07;
    });
    tail.rotation.y = Math.sin(t * 1.4) * 0.2;
  };
  animal.update(0);
}

function crystalIsland(record) {
  const { landmarks, house, top } = record;
  // A deep, dark-backed cave mouth sits under the natural rocky shoulder.
  mound(landmarks, 1.0, top + 0.7, -2.75, [1.75, 1.15, 0.9], '#9693a6');
  mound(landmarks, 1.0, top + 0.63, -2.55, [1.05, 0.7, 0.2], '#52576d');
  mound(landmarks, 1.0, top + 0.09, -1.95, [1.2, 0.08, 1.1], '#77798c');
  mesh(landmarks, new TorusGeometry(1.12, 0.4, 5, 14, Math.PI), '#8c8e9f', [1.0, top + 0.2, -1.8]);
  const colors = ['#b795cc', '#8bbdce', '#d6a0c2', '#a9c29b'];
  for (const [i, entry] of [
    [-0.8, -2.75, 1.65],
    [2.6, -2.6, 2.05],
    [3.45, -0.8, 1.15],
    [-3.35, -1.8, 0.9],
  ].entries()) {
    const [x, z, size] = entry;
    const cluster = crystal(landmarks, x, top + 0.04, z, colors[i], size);
    cluster.rotation.z = -x * 0.06;
    const satellite = crystal(landmarks, x + 0.4, top + 0.04, z + 0.22, colors[i], size * 0.45);
    satellite.rotation.z = 0.28;
  }
  const glow = new MeshStandardMaterial({
    color: '#d4c5e0',
    emissive: '#a38bbf',
    emissiveIntensity: 0.28,
    roughness: 0.75,
  });
  for (const [x, z] of [
    [-0.1, -1.35],
    [2.1, -1.35],
    [3.25, -0.35],
  ]) {
    const gem = crystal(landmarks, x, top + 0.02, z, '#d4c5e0', 0.32);
    gem.traverse((part) => {
      if (part.isMesh) part.material = glow;
    });
  }
  const lantern = crystal(house, 0.95, 1.3, 0.5, '#d4c5e0', 0.28);
  lantern.rotation.z = -0.16;
  lantern.traverse((part) => {
    if (part.isMesh) part.material = glow;
  });

  const animal = addAnimal(record, 'crystal', '#a9cbd7');
  const sprite = animal.group;
  const bodyRing = sprite.children[0];
  bodyRing.userData.animated = true;
  const orbit = new Group();
  orbit.position.y = 0.55;
  orbit.userData.animated = true;
  sprite.add(orbit);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const shard = crystal(orbit, Math.cos(a) * 0.63, -0.2, Math.sin(a) * 0.63, colors[i], 0.22);
    shard.rotation.z = 0.25;
  }
  animal.update = (seconds) => {
    const t = seconds + 14 * 1.37;
    sprite.position.set(
      0.42 + Math.sin(t * 0.52) * 0.42,
      top + 0.95 + Math.sin(t * 1.7) * 0.16,
      0.25 + Math.cos(t * 0.52) * 0.2,
    );
    sprite.rotation.set(0, Math.sin(t * 0.6) * 0.2, Math.sin(t * 1.2) * 0.08);
    orbit.rotation.y = t * 0.65;
    bodyRing.rotation.set(0.4, t * -0.32, 0);
  };
  animal.update(0);
}

function coralIsland(record) {
  const { landmarks, house, top, animate } = record;
  // Reef shelves and fan corals give this island a scalloped, underwater-garden skyline.
  mound(landmarks, -0.45, top + 0.07, -2.35, [1.8, 0.6, 1.05], '#c0d8ca');
  mound(landmarks, 2.35, top + 0.08, -1.85, [1.35, 0.9, 1.1], '#cbbdd3');
  fanCoral(landmarks, -0.8, top + 0.35, -2.3, '#dba2b3', 1.1, -0.08);
  fanCoral(landmarks, 1.8, top + 0.65, -2.15, '#afa0ca', 1.15, 0.3);
  fanCoral(landmarks, 3.4, top + 0.06, -1.1, '#e9ac8e', 0.9, -0.25);
  fanCoral(landmarks, -3.5, top + 0.06, -1.9, '#8dbbb8', 0.78, 0.25);
  // Low reef growth follows the exposed cliff face, below the NPC lawn.
  for (const [i, point] of [
    [-2.8, 3.3],
    [0.2, 3.9],
    [2.9, 3.15],
  ].entries()) {
    fanCoral(
      landmarks,
      point[0],
      top - 1.15,
      point[1],
      i % 2 ? '#b5a3ce' : '#d5a8b9',
      0.38,
      (i - 1) * 0.25,
    );
  }
  for (const [i, point] of [
    [-4.0, 1.1],
    [-3.7, 2.3],
    [0.1, 3.65],
    [2.25, 3.2],
    [4.0, 1.8],
  ].entries()) {
    const shell = mound(
      landmarks,
      point[0],
      top + 0.14,
      point[1],
      [0.26, 0.13, 0.22],
      i % 2 ? '#ead0c5' : '#e7ddbd',
    );
    shell.rotation.y = i * 0.7;
  }
  addPond(landmarks, 2.1, top + 0.17, 0.15, 0.76);
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    ball(
      landmarks,
      '#e5d4c3',
      [2.1 + Math.cos(a) * 0.88, top + 0.14, 0.15 + Math.sin(a) * 0.62],
      [0.18, 0.12, 0.16],
      7,
    );
  }
  const anemone = new Group();
  anemone.position.set(3.1, top + 0.15, -0.25);
  anemone.userData.animated = true;
  landmarks.add(anemone);
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    branch(
      anemone,
      '#b7a3cb',
      [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12],
      [Math.cos(a) * 0.28, 0.45 + (i % 2) * 0.12, Math.sin(a) * 0.28],
      0.055,
    );
  }
  animate.push((seconds) => {
    anemone.rotation.z = Math.sin(seconds * 1.1 + 1.2) * 0.07;
  });
  for (let i = 0; i < 6; i++)
    ball(house, '#f3e2ca', [-0.8 + i * 0.32, 1.62, 0.94], [0.09, 0.08, 0.09], 7);

  const animal = addAnimal(record, 'turtle', '#91b9a4');
  const turtle = animal.group;
  const flippers = turtle.children.filter(
    (part) => Math.abs(Math.abs(part.position.x) - 0.47) < 0.001,
  );
  flippers.forEach((flipper) => {
    flipper.userData.animated = true;
  });
  animal.update = (seconds) => {
    const t = seconds + 15 * 1.37;
    turtle.position.set(
      0.48 + Math.sin(t * 0.42) * 0.42,
      top + 1.25 + Math.sin(t * 1.25) * 0.15,
      0.17 + Math.cos(t * 0.42) * 0.27,
    );
    turtle.rotation.set(
      Math.sin(t * 1.25) * 0.045,
      Math.sin(t * 0.42) * 0.35,
      Math.sin(t * 1.25) * 0.045,
    );
    for (const flipper of flippers) {
      const side = Math.sign(flipper.position.x),
        phase = flipper.position.z > 0 ? 0 : Math.PI * 0.75;
      flipper.rotation.z = side * Math.sin(t * 2.1 + phase) * 0.3;
      flipper.rotation.y = side * flipper.position.z + Math.cos(t * 2.1 + phase) * 0.08;
    }
  };
  animal.update(0);
}

export function createExtendedIsland(preset) {
  const record = createIslandShell(preset);
  switch (preset.id) {
    case 'S13':
      bambooIsland(record);
      break;
    case 'S14':
      crystalIsland(record);
      break;
    case 'S15':
      coralIsland(record);
      break;
    default:
      throw new Error('島嶼模組不支援此單元');
  }
  return record;
}
