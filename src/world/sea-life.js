import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  QuadraticBezierCurve3,
  Vector3,
} from 'three';
import { ball } from './primitives.js';
import { batchStatic } from './optimize.js';

const TAU = Math.PI * 2;
const PALETTE = ['#83afc1', '#a5b4d0', '#7fb8bf', '#9caec9'];
const SCALES = [1, 0.94, 1.05, 0.97];
const ENVELOPE_RADIUS = 4.62; // Includes the largest whale and every articulated pose.
const CLEARANCE = 1.9;
const SPOUT_DURATION = 2.2;
const SPRAY_PARTS = 7;
const WAKE_PARTS = 3;
const up = new Vector3(0, 1, 0);
const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

const modulo = (value, period) => ((value % period) + period) % period;

function decorative(root) {
  root.traverse((object) => {
    object.userData.decoration = true;
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });
}

// A rectangle's rounded offset stays the same distance from the supplied box,
// including at its corners. An ellipse would cut through a wide box's corners.
function patrol(bounds) {
  const minX = bounds.min.x,
    maxX = bounds.max.x,
    minZ = bounds.min.z,
    maxZ = bounds.max.z,
    width = maxX - minX,
    depth = maxZ - minZ,
    offset = ENVELOPE_RADIUS + CLEARANCE,
    arc = (Math.PI * offset) / 2;
  const segments = [
    { length: width, x: minX, z: minZ - offset, dx: 1, dz: 0 },
    { length: arc, x: maxX, z: minZ, angle: -Math.PI / 2 },
    { length: depth, x: maxX + offset, z: minZ, dx: 0, dz: 1 },
    { length: arc, x: maxX, z: maxZ, angle: 0 },
    { length: width, x: maxX, z: maxZ + offset, dx: -1, dz: 0 },
    { length: arc, x: minX, z: maxZ, angle: Math.PI / 2 },
    { length: depth, x: minX - offset, z: maxZ, dx: 0, dz: -1 },
    { length: arc, x: minX, z: minZ, angle: Math.PI },
  ];
  const perimeter = 2 * (width + depth) + TAU * offset;
  return Object.freeze({
    minX,
    maxX,
    minZ,
    maxZ,
    offset,
    clearance: CLEARANCE,
    envelopeRadius: ENVELOPE_RADIUS,
    perimeter,
    speed: 0.48,
    startDistance: width / 2,
    sample(distance) {
      let remaining = modulo(distance, perimeter);
      for (const segment of segments) {
        if (remaining > segment.length) {
          remaining -= segment.length;
          continue;
        }
        if (segment.angle === undefined)
          return {
            x: segment.x + segment.dx * remaining,
            z: segment.z + segment.dz * remaining,
            heading: Math.atan2(segment.dx, segment.dz),
          };
        const angle = segment.angle + remaining / offset;
        return {
          x: segment.x + Math.cos(angle) * offset,
          z: segment.z + Math.sin(angle) * offset,
          heading: Math.atan2(-Math.sin(angle), Math.cos(angle)),
        };
      }
      // Floating point subtraction can cross the final endpoint by a few ulps.
      return { x: minX, z: minZ - offset, heading: Math.PI / 2 };
    },
  });
}

function water(bounds, seaY) {
  const surface = new Mesh(
    new PlaneGeometry(
      Math.max(260, bounds.max.x - bounds.min.x + 140),
      Math.max(260, bounds.max.z - bounds.min.z + 140),
    ),
    new ShaderMaterial({
      toneMapped: false,
      uniforms: { time: { value: 0 }, mint: { value: new Color('#d0e7dc') } },
      vertexShader: `
        varying vec2 waterPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          waterPosition = world.xz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 mint;
        varying vec2 waterPosition;
        void main() {
          vec2 p = waterPosition;
          float swell = sin(p.x * 0.076 + p.y * 0.051 + time * 0.11);
          float ripple = sin(p.x * 0.69 + p.y * 0.42 - time * 0.56)
                       * sin(p.y * 0.28 - p.x * 0.13 + time * 0.19);
          float gleam = pow(max(0.0, sin(p.x * 0.79 + p.y * 0.47 - time * 0.48)), 16.0)
                      * max(0.0, sin(p.y * 0.19 - p.x * 0.04 + time * 0.12));
          gl_FragColor = vec4(mint + swell * 0.009 + ripple * 0.009 + gleam * 0.04, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  surface.name = 'moving-mint-sea';
  surface.position.set(
    (bounds.min.x + bounds.max.x) / 2,
    seaY - 0.035,
    (bounds.min.z + bounds.max.z) / 2,
  );
  surface.rotation.x = -Math.PI / 2;
  surface.userData.animated = true;
  return surface;
}

function joint(parent, name, position) {
  const group = new Group();
  group.name = name;
  group.position.set(...position);
  group.userData.animated = true;
  parent.add(group);
  return group;
}

function whale(index) {
  const root = new Group(),
    color = PALETTE[index % PALETTE.length];
  root.name = `offshore-whale-${index + 1}`;
  root.userData.id = root.name;
  root.userData.species = 'offshore-whale';
  root.userData.animated = true;
  root.scale.setScalar(SCALES[index % SCALES.length]);
  ball(root, color, [0, 0.22, 0], [1.22, 1.02, 2.25], 12);
  ball(root, color, [0, 0.28, 1.33], [1.3, 0.96, 1.37], 12);
  ball(root, '#e4efdf', [0, -0.04, 0.88], [1.12, 0.59, 1.65], 12);
  // A small rounded dorsal fin helps read the silhouette without a shark shape.
  ball(root, color, [0, 1.13, -0.96], [0.16, 0.37, 0.48], 8);
  for (const side of [-1, 1]) {
    ball(root, '#314d5c', [side * 1.01, 0.65, 1.96], [0.1, 0.115, 0.095], 8);
    ball(root, '#ffffff', [side * 1.04, 0.69, 2.03], [0.03, 0.035, 0.025], 6);
    ball(root, '#e1b4b6', [side * 1.13, 0.37, 1.77], [0.115, 0.075, 0.12], 7);
  }
  const blowhole = ball(root, '#314d5c', [0, 1.2, 1.16], [0.13, 0.045, 0.16], 7);
  const smile = new Mesh(
    new TubeGeometry(
      new QuadraticBezierCurve3(
        new Vector3(-0.39, 0.39, 2.61),
        new Vector3(0, 0.17, 2.74),
        new Vector3(0.39, 0.39, 2.61),
      ),
      8,
      0.027,
      3,
      false,
    ),
    blowhole.material,
  );
  root.add(smile);
  const fins = [-1, 1].map((side) => {
    const fin = joint(root, `whale-flipper-${side < 0 ? 'left' : 'right'}`, [
      side * 1.05,
      0.08,
      0.2,
    ]);
    ball(fin, color, [side * 0.52, 0, -0.43], [0.91, 0.16, 0.45], 9).rotation.y = side * 0.4;
    return fin;
  });
  const tail = joint(root, 'whale-tail', [0, 0.14, -1.82]);
  ball(tail, color, [0, 0, -0.62], [0.55, 0.4, 1.02], 9);
  for (const side of [-1, 1]) {
    const fluke = ball(tail, color, [side * 0.69, 0.07, -1.51], [0.98, 0.2, 0.55], 9);
    fluke.rotation.y = -side * 0.31;
  }
  decorative(root);
  // Static colors and face details become one draw in the whale's local frame.
  // Each fin and tail is baked only inside its own moving joint.
  batchStatic(root);
  [...fins, tail].forEach(batchStatic);
  decorative(root);
  return { root, fins, tail, phase: index * 1.73 };
}

function instances(name, geometry, material, count) {
  const result = new InstancedMesh(geometry, material, count);
  result.name = name;
  result.userData.animated = true;
  result.instanceMatrix.setUsage(DynamicDrawUsage);
  // Tiny fixed instance counts; avoids stale per-frame bounds or their CPU rebuild.
  result.frustumCulled = false;
  return result;
}

/** Decorative, input-independent world-coordinate sea life. Never add to world bounds. */
export function createSeaLife({ bounds, seaY = -2.55, count = 4 }) {
  if (
    !bounds?.isBox3 ||
    bounds.isEmpty() ||
    ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)
  )
    throw new Error('Sea life requires finite nonempty world bounds');
  if (!Number.isFinite(seaY) || !Number.isInteger(count) || count < 0)
    throw new Error(
      'Sea height and whale count must be finite; count must be a nonnegative integer',
    );
  const root = new Group(),
    route = patrol(bounds),
    surface = water(bounds, seaY),
    motions = Array.from({ length: count }, (_, i) => whale(i)),
    stamp = new Object3D(),
    foam = new Color('#eef5e6'),
    mint = new Color('#c9e2d5'),
    tint = new Color(),
    cycle = Math.max(18, count * 4.5);
  root.name = 'decorative-sea-life';
  root.userData.animated = true;
  root.userData.offshoreClearance = route.clearance;
  root.userData.whaleEnvelopeRadius = route.envelopeRadius;
  root.userData.patrolBounds = {
    minX: route.minX,
    maxX: route.maxX,
    minZ: route.minZ,
    maxZ: route.maxZ,
  };
  root.add(surface, ...motions.map((motion) => motion.root));
  const wakes = count
    ? instances(
        'whale-wakes',
        new RingGeometry(0.89, 1, 20, 1, Math.PI * 0.08, Math.PI * 0.84),
        new MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.48,
          depthWrite: false,
          toneMapped: false,
        }),
        count * WAKE_PARTS,
      )
    : null;
  const spray = count
    ? instances(
        'whale-spouts',
        new SphereGeometry(1, 7, 5),
        new MeshBasicMaterial({
          color: '#edf7ef',
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          toneMapped: false,
        }),
        count * SPRAY_PARTS,
      )
    : null;
  if (wakes) root.add(wakes, spray);
  decorative(root);
  let time = 0;

  function update(seconds) {
    if (!Number.isFinite(seconds))
      throw new Error('Sea animation requires finite absolute seconds');
    time = seconds;
    surface.material.uniforms.time.value = seconds;
    motions.forEach((motion, i) => {
      const body = motion.root,
        distance =
          route.startDistance + (i * route.perimeter) / Math.max(1, count) + seconds * route.speed,
        point = route.sample(distance),
        swim = seconds * 1.48 + motion.phase,
        spoutPhase = modulo(seconds + 0.8 - (i * cycle) / Math.max(1, count), cycle),
        spouting = spoutPhase < SPOUT_DURATION;
      body.position.set(point.x, seaY + 0.11 + Math.sin(swim * 0.57) * 0.08, point.z);
      body.rotation.set(Math.sin(swim) * 0.015, point.heading, Math.sin(swim * 0.7) * 0.025);
      motion.fins.forEach((fin, side) => {
        fin.rotation.z = (side ? -1 : 1) * (0.1 + Math.sin(swim + side * 0.8) * 0.16);
        fin.rotation.x = Math.sin(swim + side * 0.8) * 0.07;
      });
      motion.tail.rotation.x = Math.sin(swim) * 0.16;
      body.userData.spouting = spouting;
      body.userData.spoutPhase = spouting ? spoutPhase / SPOUT_DURATION : null;
      body.userData.routeDistance = modulo(distance, route.perimeter);

      for (let j = 0; j < WAKE_PARTS; j++) {
        const drift = modulo(seconds * 0.35 + i * 0.29 + j / WAKE_PARTS, 1),
          behind = (-2.4 - j * 0.95 - drift * 0.8) * body.scale.x;
        stamp.position.set(
          point.x + Math.sin(point.heading) * behind,
          seaY + 0.045,
          point.z + Math.cos(point.heading) * behind,
        );
        stamp.quaternion.setFromAxisAngle(up, point.heading).multiply(flat);
        stamp.scale.set((1.25 + j * 0.31 + drift * 0.26) * body.scale.x, 0.52 + j * 0.12, 1);
        stamp.updateMatrix();
        wakes.setMatrixAt(i * WAKE_PARTS + j, stamp.matrix);
        tint.copy(mint).lerp(foam, (1 - drift) * (0.72 - j * 0.12));
        wakes.setColorAt(i * WAKE_PARTS + j, tint);
      }
      for (let j = 0; j < SPRAY_PARTS; j++) {
        const age = spoutPhase / SPOUT_DURATION,
          reach = spouting ? Math.sin(age * Math.PI) : 0,
          side = j % 2 ? -1 : 1;
        let localX = 0,
          localY = 1.17,
          localZ = 1.12,
          sx = 0,
          sy = 0,
          sz = 0;
        if (j === 0) {
          localY += reach * 0.72;
          sx = sz = 0.105 * reach;
          sy = 0.79 * reach;
        } else if (j < 3) {
          localX = side * reach * 0.25;
          localY += reach * 1.58;
          sx = sz = 0.115 * reach;
          sy = 0.48 * reach;
        } else {
          const spread = (j - 1) * 0.21;
          localX = side * spread * reach;
          localY += reach * (2.1 - spread * 0.3);
          localZ += ((j % 3) - 1) * 0.31 * reach;
          sx = sz = (0.1 + (j % 2) * 0.035) * reach;
          sy = 0.18 * reach;
        }
        stamp.position
          .set(localX, localY, localZ)
          .multiplyScalar(body.scale.x)
          .applyQuaternion(body.quaternion)
          .add(body.position);
        stamp.quaternion.copy(body.quaternion);
        if (j === 1 || j === 2) stamp.rotateZ(-side * 0.46);
        stamp.scale.set(sx * body.scale.x, sy * body.scale.x, sz * body.scale.x);
        stamp.updateMatrix();
        spray.setMatrixAt(i * SPRAY_PARTS + j, stamp.matrix);
      }
    });
    if (wakes) {
      wakes.instanceMatrix.needsUpdate = true;
      wakes.instanceColor.needsUpdate = true;
      spray.instanceMatrix.needsUpdate = true;
    }
  }

  function snapshot() {
    return {
      seaTime: time,
      seaY: surface.position.y,
      whales: motions.map(({ root: body }) => ({
        id: body.userData.id,
        position: body.position.toArray(),
        heading: body.rotation.y,
        spouting: body.userData.spouting,
        spoutPhase: body.userData.spoutPhase,
        routeDistance: body.userData.routeDistance,
      })),
    };
  }
  update(0);
  return { root, whales: motions.map((motion) => motion.root), update, snapshot, route };
}
