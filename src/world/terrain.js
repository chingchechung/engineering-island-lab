import {
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { random } from './primitives.js';

// Shared irregular coastline; rings taper and drift to form sloped, faceted cliffs.
export function createTerrain({ radius = 5, depth = 3.1, seed = 1, top = 0.8, stretch = 1 } = {}) {
  const group = new Group();
  group.name = 'organic-terrain';
  const rng = random(seed);
  const count = 48;
  const outline = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return {
      a,
      r: 1 + Math.sin(a * 3 + seed) * 0.105 + Math.sin(a * 7 + 1.3) * 0.065 + rng() * 0.025,
    };
  });
  const profiles = [
    { size: 0.6, y: top - depth, drift: 0.25, color: '#777c83' },
    { size: 0.84, y: top - depth * 0.68, drift: -0.13, color: '#969088' },
    { size: 1.01, y: top - depth * 0.3, drift: 0.05, color: '#b5a48b' },
    { size: 1.02, y: top - 0.25, drift: 0, color: '#dfcd9c' },
    { size: 0.96, y: top, drift: 0, color: '#6da86c' },
    { size: 0.53, y: top + 0.12, drift: 0, color: '#83b574' },
    { size: 0, y: top + 0.14, drift: 0, color: '#8fbd7b' },
  ];
  const vertices = [],
    colors = [];
  function vertex(profile, i) {
    const { a, r } = outline[i % count];
    return [
      Math.cos(a) * r * radius * profile.size + profile.drift,
      profile.y + (profile.size > 0.5 && profile.size < 0.95 ? Math.sin(a * 5 + seed) * 0.13 : 0),
      Math.sin(a) * r * radius * profile.size * stretch,
    ];
  }
  function triangle(a, b, c, color) {
    vertices.push(...a, ...b, ...c);
    const tone = new Color(color).multiplyScalar(0.97 + rng() * 0.065);
    for (let k = 0; k < 3; k++) colors.push(tone.r, tone.g, tone.b);
  }
  for (let j = 0; j < profiles.length - 1; j++) {
    for (let i = 0; i < count; i++) {
      const a = vertex(profiles[j], i),
        b = vertex(profiles[j], i + 1);
      const c = vertex(profiles[j + 1], i),
        d = vertex(profiles[j + 1], i + 1);
      triangle(a, c, b, profiles[j + 1].color);
      triangle(b, c, d, profiles[j + 1].color);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const body = new Mesh(
    geometry,
    new MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
  );
  body.name = 'coast-and-cliffs';
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  group.userData.outline = outline;
  return { group, body };
}
