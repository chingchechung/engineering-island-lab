import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  BoxGeometry,
  ConeGeometry,
} from 'three';

const materials = new Map();
const geometries = new Map();
function sharedGeometry(key, create) {
  if (!geometries.has(key)) geometries.set(key, create());
  return geometries.get(key);
}
export function isSharedGeometry(value) {
  return [...geometries.values()].includes(value);
}

export function isSharedMaterial(value) {
  return Boolean(value.userData.shared) || [...materials.values()].includes(value);
}
export function material(color) {
  if (!materials.has(color))
    materials.set(color, new MeshStandardMaterial({ color, roughness: 0.88 }));
  return materials.get(color);
}
export function mesh(parent, geometry, color, position = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new Mesh(geometry, material(color));
  object.position.set(...position);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
export function ball(parent, color, position, scale = [1, 1, 1], detail = 10) {
  return mesh(
    parent,
    sharedGeometry(`sphere-${detail}`, () => new SphereGeometry(1, detail, 7)),
    color,
    position,
    scale,
  );
}
export function box(parent, color, position, scale) {
  return mesh(
    parent,
    sharedGeometry('box', () => new BoxGeometry(1, 1, 1)),
    color,
    position,
    scale,
  );
}
export function cylinder(parent, color, position, radius, height, vertices = 12, top = radius) {
  return mesh(
    parent,
    sharedGeometry(
      `cylinder-${top}-${radius}-${height}-${vertices}`,
      () => new CylinderGeometry(top, radius, height, vertices),
    ),
    color,
    position,
  );
}
export function cone(parent, color, position, radius, height, vertices = 12) {
  return mesh(
    parent,
    sharedGeometry(
      `cone-${radius}-${height}-${vertices}`,
      () => new ConeGeometry(radius, height, vertices),
    ),
    color,
    position,
  );
}
export function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
