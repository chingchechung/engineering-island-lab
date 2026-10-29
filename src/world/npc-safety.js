import { Box3, Mesh, Raycaster, Vector3 } from 'three';

export function createNpcSafety(record) {
  record.root.updateWorldMatrix(true, true);
  // Freeze a CPU-only surface reference before the renderer batches/removes source meshes.
  const surface = new Mesh(record.terrain.geometry, record.terrain.material);
  surface.matrixAutoUpdate = false;
  surface.matrixWorld.copy(record.terrain.matrixWorld);
  const toWorld = record.root.matrixWorld.clone(),
    toLocal = toWorld.clone().invert();
  const obstacles = [];
  record.root.traverse((object) => {
    if (!object.isMesh || object === record.terrain || object.isInstancedMesh) return;
    for (let p = object; p && p !== record.root; p = p.parent)
      if (p.userData.animated || p.userData.decoration || p.name.startsWith('npc-')) return;
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3()),
      color = object.material?.color;
    const water =
      Boolean(object.userData.water) ||
      Boolean(
        color &&
          size.y < 0.35 &&
          Math.max(size.x, size.z) > 0.65 &&
          color.b > color.r * 1.08 &&
          color.g > color.r * 1.05,
      );
    if (box.max.y > record.root.position.y + record.top + 0.32 || water) {
      const frozen = new Mesh(object.geometry, object.material);
      frozen.matrixAutoUpdate = false;
      frozen.matrixWorld.copy(object.matrixWorld);
      obstacles.push({ mesh: frozen, box, water });
    }
  });
  const ray = new Raycaster(),
    sight = new Raycaster(),
    cache = new Map();
  const towardCamera = new Vector3(8, 31, 34).normalize();
  sight.far = 29.98;
  function sample(x, z) {
    const key = `${Math.round(x / 0.08)},${Math.round(z / 0.08)}`;
    if (cache.has(key)) return cache.get(key);
    x = Math.round(x / 0.08) * 0.08;
    z = Math.round(z / 0.08) * 0.08;
    const origin = new Vector3(x, record.top + 16, z).applyMatrix4(toWorld);
    ray.set(origin, new Vector3(0, -1, 0));
    const hit = ray.intersectObject(surface, false)[0];
    if (!hit) {
      cache.set(key, null);
      return null;
    }
    const local = hit.point.clone().applyMatrix4(toLocal);
    let blocked = local.y < record.top - 0.025 || local.y > record.top + 0.32;
    if (!blocked)
      for (const obstacle of obstacles) {
        if (
          origin.x < obstacle.box.min.x - 0.01 ||
          origin.x > obstacle.box.max.x + 0.01 ||
          origin.z < obstacle.box.min.z - 0.01 ||
          origin.z > obstacle.box.max.z + 0.01
        )
          continue;
        const obstruction = ray.intersectObject(obstacle.mesh, false)[0];
        if (obstruction && (obstacle.water || obstruction.point.y > hit.point.y + 0.32)) {
          blocked = true;
          break;
        }
      }
    if (!blocked) {
      const body = hit.point.clone().add(new Vector3(0, 0.93, 0));
      sight.set(body.clone().addScaledVector(towardCamera, 30), towardCamera.clone().negate());
      for (const obstacle of obstacles) {
        if (
          sight.ray.intersectsBox(obstacle.box) &&
          sight.intersectObject(obstacle.mesh, false).length
        ) {
          blocked = true;
          break;
        }
      }
    }
    const value = { height: local.y, blocked };
    cache.set(key, value);
    return value;
  }
  return {
    heightAt(x, z) {
      const gx = Math.floor(x / 0.08),
        gz = Math.floor(z / 0.08),
        tx = x / 0.08 - gx,
        tz = z / 0.08 - gz;
      const a = sample(gx * 0.08, gz * 0.08),
        b = sample((gx + 1) * 0.08, gz * 0.08),
        c = sample(gx * 0.08, (gz + 1) * 0.08),
        d = sample((gx + 1) * 0.08, (gz + 1) * 0.08);
      if (!a || !b || !c || !d) return null;
      return (
        (a.height * (1 - tx) + b.height * tx) * (1 - tz) +
        (c.height * (1 - tx) + d.height * tx) * tz
      );
    },
    isSafe(x, z) {
      return [
        [0, 0],
        [0.26, 0],
        [-0.26, 0],
        [0, 0.26],
        [0, -0.26],
      ].every(([dx, dz]) => {
        const value = sample(x + dx, z + dz);
        return value && !value.blocked;
      });
    },
    findStart(center, peers) {
      const candidates = [[center.x, center.z]];
      for (const radius of [0.25, 0.5, 0.75, 1.0, 1.3])
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          candidates.push([center.x + Math.cos(a) * radius, center.z + Math.sin(a) * radius]);
        }
      const selected = candidates.find(
        ([x, z]) =>
          this.isSafe(x, z) &&
          peers.every((peer) => Math.hypot(x - peer.position.x, z - peer.position.z) >= 1.05),
      );
      if (!selected) throw new Error(`${record.preset.id} 沒有安全 NPC 起點`);
      return new Vector3(selected[0], this.heightAt(...selected) + 0.08, selected[1]);
    },
  };
}
