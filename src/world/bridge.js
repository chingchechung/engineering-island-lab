import {
  CatmullRomCurve3,
  Group,
  Matrix4,
  TubeGeometry,
  Vector3,
  TorusGeometry,
  Raycaster,
} from 'three';
import { ball, box, cylinder, mesh } from './primitives.js';

// A scenic footbridge only: no picking, collision, navigation, or input handlers.
export function createBridge(start, end) {
  const group = new Group();
  group.name = 'scenic-bridge';
  group.userData.decoration = true;
  const up = new Vector3(0, 1, 0);
  const span = end.clone().sub(start);
  const lateral = new Vector3(-span.z, 0, span.x).normalize();
  const postCount = Math.max(5, Math.ceil(span.length() / 1.1));
  const points = Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const point = start.clone().lerp(end, t);
    point.y += Math.sin(t * Math.PI) * 0.6;
    point.addScaledVector(lateral, Math.sin(t * Math.PI) * 0.35);
    return point;
  });
  const curve = new CatmullRomCurve3(points);
  const acrossAt = (t) => new Vector3().crossVectors(up, curve.getTangentAt(t)).normalize();
  const offsetAt = (t, side, height) =>
    curve.getPointAt(t).addScaledVector(acrossAt(t), side).addScaledVector(up, height);
  const timberColors = ['#c39769', '#d0a779', '#bc8e60', '#d8af80'];
  const deck = new Group();
  deck.name = 'bridge-deck';
  group.add(deck);
  const count = Math.max(25, Math.ceil(curve.getLength() / 0.23));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const tangent = curve.getTangentAt(t);
    const across = acrossAt(t);
    const normal = new Vector3().crossVectors(tangent, across).normalize();
    const plank = box(deck, timberColors[i % timberColors.length], curve.getPointAt(t).toArray(), [
      1.1,
      0.13,
      (curve.getLength() / count) * 0.94,
    ]);
    plank.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(across, normal, tangent));
  }
  for (const side of [-0.48, 0.48]) {
    const beam = new CatmullRomCurve3(points.map((_, i) => offsetAt(i / 32, side, -0.13)));
    mesh(group, new TubeGeometry(beam, 40, 0.075, 6, false), '#886951');
    // Slim posts and gently dipping rope handrails keep the silhouette light.
    for (let i = 0; i <= postCount; i++) {
      const foot = offsetAt(i / postCount, side, 0);
      cylinder(group, '#936e50', foot.clone().addScaledVector(up, 0.4).toArray(), 0.065, 0.87, 7);
      ball(
        group,
        '#d5b37d',
        foot.clone().addScaledVector(up, 0.87).toArray(),
        [0.09, 0.09, 0.09],
        7,
      );
    }
    for (const height of [0.43, 0.78]) {
      const rope = new CatmullRomCurve3(
        Array.from({ length: 61 }, (_, i) => {
          const t = i / 60;
          return offsetAt(t, side, height - Math.abs(Math.sin(t * Math.PI * postCount)) * 0.07);
        }),
      );
      mesh(group, new TubeGeometry(rope, 60, 0.035, 5, false), '#d3b98a');
    }
    for (const t of [0, 1]) {
      const foot = offsetAt(t, side, -0.28);
      ball(group, '#b8ad90', foot.toArray(), [0.24, 0.25, 0.3], 7);
    }
  }
  return { group, curve };
}

// Cast only onto the actual coastal mesh, never onto buildings or animals.
export function findShore(terrain, toward) {
  terrain.updateWorldMatrix(true, false);
  const { radius, top, stretch } = terrain.userData.surface;
  const center = terrain.getWorldPosition(new Vector3());
  const direction = toward.clone().sub(center);
  direction.y = 0;
  direction.normalize();
  const max = radius * Math.max(1, stretch) * 1.4;
  const ray = new Raycaster();
  for (let distance = max; distance > radius * 0.35; distance -= 0.12) {
    const point = center.clone().addScaledVector(direction, distance);
    ray.set(new Vector3(point.x, center.y + top + 15, point.z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(terrain)[0];
    if (hit && hit.point.y >= center.y + top - 0.06) {
      point.addScaledVector(direction, -0.3);
      ray.set(new Vector3(point.x, center.y + top + 15, point.z), new Vector3(0, -1, 0));
      const bank = ray.intersectObject(terrain)[0];
      if (bank) return bank.point.clone().add(new Vector3(0, 0.16, 0));
    }
  }
  throw new Error('無法找到木橋的實際接岸地形');
}

export function createGate(curve) {
  const root = new Group();
  root.name = 'locked-gate';
  root.position.copy(curve.getPointAt(0.93));
  const tangent = curve.getTangentAt(0.93);
  tangent.y = 0;
  tangent.normalize();
  root.rotation.y = Math.atan2(tangent.x, tangent.z);
  for (const x of [-0.6, 0.6]) {
    cylinder(root, '#9b7858', [x, 0.53, 0], 0.085, 1.06, 7);
    ball(root, '#d8ba87', [x, 1.1, 0], [0.11, 0.11, 0.11]);
  }
  for (let i = 0; i < 5; i++) {
    box(root, '#c39c6f', [-0.48 + i * 0.24, 0.58, 0], [0.14, 0.7, 0.09]);
  }
  box(root, '#987452', [0, 0.44, -0.04], [1.2, 0.1, 0.09]);
  box(root, '#987452', [0, 0.82, -0.04], [1.2, 0.1, 0.09]);
  box(root, '#e8c479', [0, 0.7, 0.09], [0.32, 0.28, 0.13]);
  mesh(root, new TorusGeometry(0.12, 0.035, 5, 12, Math.PI), '#e8c479', [0, 0.84, 0.1]);
  ball(root, '#8b7959', [0, 0.72, 0.17], [0.028, 0.05, 0.01]);
  const anchor = new Group();
  anchor.position.set(0, 1.48, 0);
  root.add(anchor);
  return { root, anchor };
}
