import { CatmullRomCurve3, Group, Matrix4, TubeGeometry, Vector3 } from 'three';
import { ball, box, cylinder, mesh } from './primitives.js';

// A scenic footbridge only: no picking, collision, navigation, or input handlers.
export function createBridge(start, end) {
  const group = new Group();
  group.name = 'scenic-bridge';
  group.userData.decoration = true;
  const up = new Vector3(0, 1, 0);
  const points = Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const point = start.clone().lerp(end, t);
    point.y += Math.sin(t * Math.PI) * 0.6;
    point.z += Math.sin(t * Math.PI) * 0.35;
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
  const count = 25;
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
    for (let i = 0; i <= 5; i++) {
      const foot = offsetAt(i / 5, side, 0);
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
          return offsetAt(t, side, height - Math.abs(Math.sin(t * Math.PI * 5)) * 0.07);
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
