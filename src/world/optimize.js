import { Matrix4, Mesh, MeshStandardMaterial, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isSharedGeometry, isSharedMaterial } from './primitives.js';

const batchMaterials = new Map();
function vertexMaterial(source) {
  if (
    !source.isMeshStandardMaterial ||
    source.map ||
    source.transparent ||
    source.emissive.getHex() !== 0
  )
    return source;
  const key = [
    source.roughness,
    source.metalness,
    source.flatShading,
    source.side,
    source.depthWrite,
  ].join(':');
  if (!batchMaterials.has(key)) {
    const material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: source.roughness,
      metalness: source.metalness,
      flatShading: source.flatShading,
      side: source.side,
      depthWrite: source.depthWrite,
    });
    material.userData.shared = true;
    batchMaterials.set(key, material);
  }
  return batchMaterials.get(key);
}

// Bake static transforms while retaining independent action, detail and shadow groups.
export function batchStatic(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map(),
    sources = [];
  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh) return;
    let dynamic = Boolean(object.userData.animated),
      detail = false;
    for (let p = object.parent; p && p !== root; p = p.parent) {
      dynamic ||= Boolean(p.userData.animated);
      detail ||= Boolean(p.userData.detail);
    }
    if (dynamic) return;
    detail ||= Boolean(object.userData.detail);
    const mat = vertexMaterial(object.material);
    const key = [
      mat.uuid,
      JSON.stringify(object.userData.action),
      detail,
      object.castShadow,
      object.receiveShadow,
    ].join('|');
    if (!buckets.has(key)) buckets.set(key, { objects: [], detail, material: mat });
    buckets.get(key).objects.push(object);
    sources.push(object);
  });
  for (const { objects, detail, material } of buckets.values()) {
    const geometries = objects.map((object) => {
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      // Terrain has no UVs. A uniform attribute layout is sufficient within each material bucket.
      if (geometry.getAttribute('uv')) geometry.deleteAttribute('uv');
      if (material.vertexColors) {
        const previous = geometry.getAttribute('color'),
          color = object.material.color,
          count = geometry.getAttribute('position').count;
        const values = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          values[i * 3] = (previous ? previous.getX(i) : 1) * color.r;
          values[i * 3 + 1] = (previous ? previous.getY(i) : 1) * color.g;
          values[i * 3 + 2] = (previous ? previous.getZ(i) : 1) * color.b;
        }
        geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
      }
      return geometry;
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!geometry) throw new Error('靜態模型合批失敗');
    const first = objects[0],
      merged = new Mesh(geometry, material);
    merged.name = first.name;
    merged.userData = { ...first.userData, detail, shadowable: first.castShadow };
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    root.add(merged);
  }
  const discarded = new Set(),
    discardedMaterials = new Set();
  const retainedMaterials = new Set([...buckets.values()].map((bucket) => bucket.material));
  for (const object of sources) {
    object.removeFromParent();
    if (!isSharedMaterial(object.material) && !retainedMaterials.has(object.material))
      discardedMaterials.add(object.material);
    if (!isSharedGeometry(object.geometry)) discarded.add(object.geometry);
  }
  discarded.forEach((g) => g.dispose());
  discardedMaterials.forEach((m) => m.dispose());
}

export function disposeScene(scene) {
  const geometries = new Set(),
    materials = new Set();
  scene.traverse((object) => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry && !isSharedGeometry(object.geometry)) geometries.add(object.geometry);
    if (object.material && !isSharedMaterial(object.material)) materials.add(object.material);
    if (object.isLight && object.shadow) object.shadow.dispose();
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
