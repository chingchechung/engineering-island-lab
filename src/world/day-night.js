import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  ShaderMaterial,
  Vector3,
} from 'three';
import { disposeScene } from './optimize.js';

export const DAY_NIGHT_SECONDS = 1.25;
const WARM = '#ffd593',
  PINK = '#ffafd4',
  ICE = '#a5e5ff',
  LILAC = '#d3b5ff';
const UP = new Vector3(0, 1, 0);
const THEMES = {
  S01: { kind: 'fireflies', colors: ['#e3ef9d', WARM] },
  S02: { kind: 'flower-lights', colors: [PINK, WARM] },
  S03: { kind: 'lighthouse', colors: [WARM] },
  S04: { kind: 'lake-reflections', colors: [ICE, WARM] },
  S05: { kind: 'lava', colors: ['#ff935b', '#ffbb68'] },
  S06: { kind: 'candy-lights', colors: [PINK, WARM] },
  S07: { kind: 'ice-crystals', colors: [ICE, '#c8edff'] },
  S08: { kind: 'windmill-lights', colors: [WARM] },
  S09: { kind: 'stars-and-flowers', colors: [LILAC, WARM] },
  S10: { kind: 'oasis-camp', colors: [WARM, ICE] },
  S11: { kind: 'cloud-lights', colors: [ICE, WARM] },
  S12: { kind: 'festival-lights', colors: [PINK, WARM, ICE, LILAC] },
  S13: { kind: 'bamboo-lanterns', colors: [WARM] },
  S14: { kind: 'crystals', colors: [LILAC, ICE, PINK, '#c4eeb4'] },
  S15: { kind: 'coral-fluorescence', colors: [ICE, PINK, LILAC] },
};
const smooth = (t) => t * t * (3 - 2 * t);

function glowMaterial() {
  // Instanced, texture-free soft light stamps. These do not add renderer lights or shadow maps.
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { strength: { value: 0 } },
    vertexShader: `
      varying vec2 glowUv;
      varying vec3 glowColor;
      void main() {
        glowUv = uv;
        glowColor = instanceColor;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float strength;
      varying vec2 glowUv;
      varying vec3 glowColor;
      void main() {
        float radius = length(glowUv - 0.5) * 2.0;
        float alpha = pow(max(0.0, 1.0 - radius), 1.8) * strength;
        gl_FragColor = vec4(glowColor, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Independent nighttime fixtures; never part of curriculum picking, navigation or framing. */
export function createDayNight({ scene, academy, records, seaLife }) {
  const hemisphere = scene.children.find((o) => o.isHemisphereLight);
  const sun = scene.children.find((o) => o.isDirectionalLight);
  if (!hemisphere || !sun) throw new Error('Day/night requires the existing daylight rig');
  const day = {
    background: scene.background.clone(),
    sky: hemisphere.color.clone(),
    ground: hemisphere.groundColor.clone(),
    ambient: hemisphere.intensity,
    sun: sun.color.clone(),
    sunlight: sun.intensity,
  };
  const night = {
    background: new Color('#172d48'),
    sky: new Color('#a3c7ef'),
    ground: new Color('#53677e'),
    sun: new Color('#a7c8f5'),
  };
  const root = new Group();
  root.name = 'day-night-fixtures';
  root.userData.decoration = true;
  root.userData.animated = true;
  root.visible = false;
  scene.add(root);
  scene.updateMatrixWorld(true);
  const entries = { panes: [], bulbs: [], halos: [], pools: [], crystals: [], surfaces: [] };
  const fireflies = [];
  const counts = { academyWindows: 0, academyEntrance: 0, cottages: {}, bridges: [], themes: [] };
  const worldPoint = (parent, position) => parent.localToWorld(new Vector3(...position));
  const point = (parent, position, scale, color = WARM, rotation = null) => ({
    position: worldPoint(parent, position),
    scale,
    color,
    rotation,
  });
  function bulb(parent, position, radius = 0.12, color = WARM) {
    entries.bulbs.push(point(parent, position, [radius, radius * 1.15, radius], color));
    entries.halos.push(
      point(parent, position, [radius * 2.25, radius * 2.4, radius * 2.25], color),
    );
  }
  function pool(parent, position, scale, color = WARM) {
    entries.pools.push(point(parent, position, scale, color, [-Math.PI / 2, 0, 0]));
  }
  function panes(parent, x, y, z, angle = 0) {
    // Two panes leave the original central wooden mullion visible.
    for (const side of [-1, 1]) {
      const local = new Vector3(side * 0.076, 0, 0).applyAxisAngle(UP, angle);
      entries.panes.push(
        point(parent, [x + local.x, y, z + local.z], [0.118, 0.405, 0.012], WARM, [
          0,
          angle + parent.rotation.y,
          0,
        ]),
      );
    }
  }
  function crystal(parent, position, scale, color) {
    entries.crystals.push(point(parent, position, scale, color));
    entries.halos.push(
      point(
        parent,
        position,
        scale.map((v) => v * 1.45),
        color,
      ),
    );
  }
  const campus = academy.getObjectByName('academy-building');
  if (!campus) throw new Error('The original academy building must be retained');
  for (const x of [-1.15, 1.15]) panes(campus, x, 1.17, 1.048);
  for (const x of [-1.9, 1.9]) panes(campus, x, 2.37, 0.518);
  panes(campus, 0, 3.57, 0.088);
  // Rear and side windows keep the miniature welcoming when the camera circles behind it.
  for (const x of [-1.1, 1.1]) panes(campus, x, 1.17, -0.907, Math.PI);
  for (const x of [-1.709, 1.709]) panes(campus, x, 1.12, 0.5, x < 0 ? -Math.PI / 2 : Math.PI / 2);
  counts.academyWindows = entries.panes.length / 2;
  for (const x of [-0.74, 0.74]) {
    bulb(campus, [x, 1.48, 1.01], 0.15);
    counts.academyEntrance++;
  }
  pool(campus, [0, -0.07, 1.75], [1.55, 1.05, 1]);
  const focusLamps = new Map([['academy', worldPoint(campus, [0, 1.5, 1.6])]]);

  for (const [id, record] of records) {
    const { root: island, house, top } = record;
    const startPanes = entries.panes.length,
      startBulbs = entries.bulbs.length;
    panes(house, 0.5, 0.92, 0.828);
    panes(house, -0.35, 0.92, -0.707, Math.PI);
    panes(house, 0.907, 0.92, -0.2, Math.PI / 2);
    panes(house, -0.907, 0.92, -0.2, -Math.PI / 2);
    bulb(house, [-0.69, 1.33, 0.9], 0.105);
    bulb(house, [0.85, 1.33, 0.9], 0.105);
    pool(house, [-0.2, -0.11, 1.15], [0.92, 0.65, 1]);
    focusLamps.set(id, worldPoint(house, [-0.1, 1.15, 1.2]));
    counts.cottages[id] = {
      windows: (entries.panes.length - startPanes) / 2,
      lamps: entries.bulbs.length - startBulbs,
    };

    const { curve, from } = record.link;
    const main = from === 'academy';
    // Actual post locations, with generous gaps instead of a continuous glowing ribbon.
    const postCount = Math.max(5, Math.ceil(curve.points[0].distanceTo(curve.points.at(-1)) / 1.1));
    const firstBulb = entries.bulbs.length;
    for (let i = 1; i < postCount; i += main ? 3 : 5) {
      const t = i / postCount,
        center = curve.getPointAt(t),
        across = new Vector3().crossVectors(UP, curve.getTangentAt(t)).normalize();
      for (const side of [-0.48, 0.48]) {
        const position = center.clone().addScaledVector(across, side).addScaledVector(UP, 0.9);
        bulb(root, position.toArray(), main ? 0.14 : 0.115);
      }
      pool(root, center.clone().addScaledVector(UP, 0.085).toArray(), [0.7, 0.55, 1]);
    }
    counts.bridges.push({ from, to: id, main, lamps: entries.bulbs.length - firstBulb });
    const theme = THEMES[id],
      before = Object.values(entries).reduce((sum, values) => sum + values.length, 0);
    const color = (i) => theme.colors[i % theme.colors.length];
    if (id === 'S01') {
      for (let i = 0; i < 9; i++) {
        fireflies.push({ core: entries.bulbs.length, halo: entries.halos.length, phase: i * 1.7 });
        bulb(
          island,
          [-3.4 + i * 0.78, top + 1.3 + Math.sin(i * 2) * 0.35, -1.8 + Math.sin(i) * 0.4],
          0.055,
          color(i),
        );
      }
    } else if (id === 'S02') {
      for (let i = 0; i < 7; i++)
        bulb(
          island,
          [1.86 + i * 0.2, top + 1.8 + Math.sin((i / 6) * Math.PI) * 0.3, -0.98],
          0.085,
          color(i),
        );
      for (let i = 0; i < 6; i++)
        bulb(island, [Math.cos(i) * 1.1, top + 0.98, -1.7 + Math.sin(i) * 0.7], 0.07, color(i));
    } else if (id === 'S03') {
      for (let i = 0; i < 8; i++)
        bulb(
          island,
          [
            3.1 + Math.cos((i / 8) * Math.PI * 2) * 0.275,
            top + 2.08,
            -1.65 + Math.sin((i / 8) * Math.PI * 2) * 0.275,
          ],
          0.1,
          WARM,
        );
      pool(island, [3.1, top + 0.05, -1.65], [0.78, 0.78, 1]);
    } else if (id === 'S04') {
      for (const x of [-0.96, 3.26]) bulb(island, [x, top + 1.2, -1.75], 0.12);
      pool(island, [1.1, top + 0.228, -1.53], [1.65, 0.8, 1], ICE);
    } else if (id === 'S05') {
      entries.surfaces.push(
        point(island, [0.9, top + 2.371, -1.8], [0.635, 0.635, 1], color(0), [-Math.PI / 2, 0, 0]),
      );
      for (let i = 0; i < 9; i++)
        bulb(
          island,
          [
            0.9 + Math.cos((i / 9) * Math.PI * 2) * 0.81,
            top + 2.72,
            -1.8 + Math.sin((i / 9) * Math.PI * 2) * 0.81,
          ],
          0.095,
          color(i),
        );
      for (const [x, y, z] of [
        [1.8, 1.62, -0.9],
        [1.93, 0.92, -0.77],
        [2.25, 0.2, -0.45],
        [2.7, 0.19, 0.25],
      ])
        bulb(island, [x, top + y, z], 0.115, color(0));
      pool(island, [0.9, top + 2.38, -1.8], [0.8, 0.8, 1], color(0));
    } else if (id === 'S06') {
      for (let i = 0; i < 6; i++)
        bulb(island, [-1.1 + i * 0.65, top + 0.38, -3.25 + Math.sin(i) * 0.15], 0.16, color(i));
    } else if (id === 'S07') {
      for (const [x, z, size] of [
        [-3.6, -1.3, 0.55],
        [-0.7, -0.7, 0.45],
        [3.7, -0.1, 0.55],
        [2.8, -2.7, 0.7],
      ])
        crystal(
          island,
          [x, top + size * 1.18, z],
          [size * 0.165, size * 0.42, size * 0.165],
          color(0),
        );
      pool(island, [2.4, top + 0.218, 0.8], [0.9, 0.55, 1], ICE);
    } else if (id === 'S08') {
      panes(island, 1.2, top + 0.8, -0.974);
      for (let i = 0; i < 5; i++)
        bulb(
          island,
          [
            1.2 + Math.cos((i / 5) * Math.PI * 2) * 0.5,
            top + 2.95,
            -1.7 + Math.sin((i / 5) * Math.PI * 2) * 0.5,
          ],
          0.08,
        );
    } else if (id === 'S09') {
      for (const [i, [x, y, z]] of [
        [0.7, 4.7, -2.1],
        [2.9, 4.5, -2.8],
        [-2.7, 3.3, -2.7],
      ].entries())
        bulb(island, [x, y, z + 0.06], 0.13, color(i));
      for (let i = 0; i < 7; i++)
        bulb(island, [-3.3 + i * 1.05, top + 0.65, -1.65 + Math.sin(i) * 0.4], 0.085, color(i));
    } else if (id === 'S10') {
      for (const [x, z] of [
        [-3.7, 0.7],
        [1.6, -3.4],
        [3.95, 1.9],
      ]) {
        bulb(island, [x, top + 0.56, z], 0.14);
        pool(island, [x, top + 0.025, z], [0.65, 0.65, 1]);
      }
      pool(island, [2.35, top + 0.2, 0.75], [0.8, 0.55, 1], ICE);
    } else if (id === 'S11') {
      for (let i = 0; i < 11; i++)
        bulb(
          island,
          [
            Math.cos((i * Math.PI * 2) / 11) * 3.95,
            top - 0.5,
            Math.sin((i * Math.PI * 2) / 11) * 3.3,
          ],
          0.14,
          color(i),
        );
    } else if (id === 'S12') {
      for (let i = 0; i < 13; i++)
        bulb(
          island,
          [-2.6 + i * 0.44, top + 3.15 - Math.sin((i / 12) * Math.PI) * 0.3, -2.8],
          0.105,
          color(i),
        );
    } else if (id === 'S13') {
      for (const [x, z] of [
        [-3.3, -1.3],
        [0.1, -2.6],
        [3.5, -1.6],
      ]) {
        bulb(island, [x, top + 1.25, z], 0.14);
        pool(island, [x, top + 0.035, z], [0.65, 0.65, 1]);
      }
    } else if (id === 'S14') {
      for (const [i, [x, z, size]] of [
        [-0.8, -2.75, 1.65],
        [2.6, -2.6, 2.05],
        [3.45, -0.8, 1.15],
        [-3.35, -1.8, 0.9],
      ].entries()) {
        crystal(
          island,
          [x, top + size * 1.22, z],
          [size * 0.18, size * 0.4, size * 0.18],
          color(i),
        );
        pool(island, [x, top + 0.07, z], [0.75, 0.6, 1], color(i));
      }
    } else if (id === 'S15') {
      for (const [i, [x, z]] of [
        [-0.8, -2.3],
        [1.8, -2.15],
        [3.4, -1.1],
        [-3.5, -1.9],
      ].entries()) {
        for (const side of [-1, 0, 1])
          bulb(
            island,
            [x + side * 0.25, top + 1.55 + Math.abs(side) * 0.2, z],
            0.095,
            color(i + Math.abs(side)),
          );
      }
    }
    counts.themes.push({
      id,
      kind: theme.kind,
      fixtures: Object.values(entries).reduce((sum, values) => sum + values.length, 0) - before,
    });
  }

  const paneMaterial = new MeshStandardMaterial({
    color: '#ffdca2',
    emissive: '#ffb95c',
    emissiveIntensity: 1.6,
    roughness: 0.8,
    transparent: true,
    opacity: 0,
  });
  const coreMaterial = new MeshBasicMaterial({
    color: '#ffffff',
    toneMapped: false,
    transparent: true,
    opacity: 0,
  });
  const haloMaterial = new MeshBasicMaterial({
    color: '#ffffff',
    toneMapped: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const poolMaterial = glowMaterial();
  const models = [
    ['window-panes', 'panes', new BoxGeometry(1, 1, 1), paneMaterial],
    ['lantern-cores', 'bulbs', new IcosahedronGeometry(1, 0), coreMaterial],
    ['soft-lantern-halos', 'halos', new IcosahedronGeometry(1, 0), haloMaterial],
    ['light-pools', 'pools', new CircleGeometry(1, 20), poolMaterial],
    ['crystal-tips', 'crystals', new ConeGeometry(1, 1, 5), coreMaterial],
    ['luminous-surfaces', 'surfaces', new CircleGeometry(1, 24), coreMaterial],
  ];
  const stamp = new Object3D(),
    meshes = [];
  for (const [name, key, geometry, material] of models) {
    if (!entries[key].length) {
      geometry.dispose();
      continue;
    }
    const mesh = new InstancedMesh(geometry, material, entries[key].length);
    mesh.name = `night-${name}`;
    mesh.userData.decoration = true;
    mesh.castShadow = mesh.receiveShadow = false;
    for (const [i, entry] of entries[key].entries()) {
      stamp.position.copy(entry.position);
      stamp.scale.set(...entry.scale);
      stamp.rotation.set(...(entry.rotation ?? [0, 0, 0]));
      stamp.updateMatrix();
      mesh.setMatrixAt(i, stamp.matrix);
      mesh.setColorAt(i, new Color(entry.color));
    }
    mesh.computeBoundingSphere();
    root.add(mesh);
    meshes.push(mesh);
  }
  const localLight = new PointLight('#ffce85', 0, 5.5, 2);
  localLight.name = 'focused-porch-light';
  localLight.castShadow = false;
  root.add(localLight);
  let mode = 'day',
    progress = 0,
    blend = 0,
    animationTime = 0,
    disposed = false;
  function apply(view = 'overview') {
    scene.background.copy(day.background).lerp(night.background, blend);
    hemisphere.color.copy(day.sky).lerp(night.sky, blend);
    hemisphere.groundColor.copy(day.ground).lerp(night.ground, blend);
    hemisphere.intensity = day.ambient + (0.68 - day.ambient) * blend;
    sun.color.copy(day.sun).lerp(night.sun, blend);
    sun.intensity = day.sunlight + (0.48 - day.sunlight) * blend;
    seaLife.setNightBlend(blend);
    root.visible = blend > 0;
    paneMaterial.opacity = blend;
    coreMaterial.opacity = blend;
    haloMaterial.opacity = blend * 0.065;
    poolMaterial.uniforms.strength.value = blend * 0.24;
    const focus = focusLamps.get(view);
    localLight.visible = Boolean(focus) && blend > 0;
    localLight.intensity = focus ? blend * (view === 'academy' ? 5 : 3.8) : 0;
    if (focus) localLight.position.copy(focus);
  }
  function setMode(next) {
    if (!['day', 'night'].includes(next)) throw new Error('Lighting mode must be day or night');
    mode = next;
  }
  function update(dt, { view = 'overview' } = {}) {
    if (disposed) return;
    if (!Number.isFinite(dt) || dt < 0)
      throw new Error('Lighting delta must be finite and nonnegative');
    const step = dt / DAY_NIGHT_SECONDS;
    progress = mode === 'night' ? Math.min(1, progress + step) : Math.max(0, progress - step);
    blend = smooth(progress);
    animationTime += dt;
    if (blend > 0) {
      for (const { core, halo, phase } of fireflies) {
        for (const [index, key, name] of [
          [core, 'bulbs', 'night-lantern-cores'],
          [halo, 'halos', 'night-soft-lantern-halos'],
        ]) {
          const entry = entries[key][index];
          stamp.position
            .copy(entry.position)
            .add(
              new Vector3(
                Math.sin(animationTime * 0.55 + phase) * 0.12,
                Math.sin(animationTime * 0.8 + phase) * 0.17,
                Math.cos(animationTime * 0.5 + phase) * 0.1,
              ),
            );
          stamp.scale.set(...entry.scale);
          stamp.rotation.set(0, 0, 0);
          stamp.updateMatrix();
          const mesh = root.getObjectByName(name);
          mesh.setMatrixAt(index, stamp.matrix);
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    }
    apply(view);
  }
  function snapshot() {
    return {
      mode,
      blend,
      duration: DAY_NIGHT_SECONDS,
      background: `#${scene.background.getHexString()}`,
      seaColor: `#${seaLife.root.getObjectByName('moving-mint-sea').material.uniforms.mint.value.getHexString()}`,
      ambientIntensity: hemisphere.intensity,
      directionalIntensity: sun.intensity,
      academyWindows: counts.academyWindows,
      academyEntrance: counts.academyEntrance,
      cottages: structuredClone(counts.cottages),
      bridges: structuredClone(counts.bridges),
      themes: structuredClone(counts.themes),
      fixtures: Object.fromEntries(
        Object.entries(entries).map(([key, values]) => [key, values.length]),
      ),
      batches: meshes.length,
      actualLocalLights: localLight.visible ? 1 : 0,
      localShadowLights: 0,
      shadowLights: sun.castShadow ? 1 : 0,
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    blend = 0;
    apply();
    root.removeFromParent();
    disposeScene(root);
    // Empty geometry categories did not retain these owned materials.
    for (const material of new Set([paneMaterial, coreMaterial, haloMaterial, poolMaterial]))
      if (!meshes.some((mesh) => mesh.material === material)) material.dispose();
  }
  apply();
  return { root, setMode, update, snapshot, dispose };
}
