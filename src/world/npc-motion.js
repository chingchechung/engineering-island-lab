import { Group } from 'three';

const STEP = 1 / 60;
const MAX_DELTA = 0.25;
const SAMPLE_SPACING = 0.06;
const PEER_DISTANCE = 0.9;
const MAX_SLOPE = 0.8;
const TAU = Math.PI * 2;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// Keep the original clothes, hat, face and mesh actions. Only the existing
// boots/legs and hands are parented to small local animation pivots.
function makeLimbs(npc) {
  const meshes = npc.children.filter((child) => child.isMesh);
  const limbs = [];
  for (const side of [-1, 1]) {
    for (const kind of ['leg', 'arm']) {
      const parts = meshes.filter((part) => {
        const { x, y } = part.position;
        if (Math.sign(x) !== side) return false;
        return kind === 'leg'
          ? Math.abs(x) < 0.25 && y >= 0 && y <= 0.42
          : Math.abs(x) > 0.3 && y > 0.42 && y < 0.9;
      });
      if (!parts.length) continue;
      const pivot = new Group();
      pivot.name = `npc-motion-${side < 0 ? 'left' : 'right'}-${kind}`;
      pivot.userData.animated = true;
      pivot.position.set(parts[0].position.x, kind === 'leg' ? 0.45 : 0.79, 0);
      npc.add(pivot);
      for (const part of parts) {
        part.position.sub(pivot.position);
        pivot.add(part);
      }
      limbs.push({ pivot, side, kind });
    }
  }
  return limbs;
}

/**
 * Local-coordinate decorative roaming, independent of DOM, camera and Quiz.
 * heightAt returns the local ground Y; the initial standing offset is retained.
 * peers returns NPC roots in the same local coordinate frame as this NPC.
 * Call before static batching so the root and limb pivots remain movable.
 */
export function createNpcMotion(
  npc,
  { center, radius = 1.05, seed = 1, isSafe, heightAt, peers = () => [] },
) {
  if (!npc?.isObject3D || !center || ![center.x, center.y, center.z].every(Number.isFinite))
    throw new TypeError('NPC motion requires an Object3D and a finite local center');
  if (!Number.isFinite(radius) || radius < 0)
    throw new RangeError('NPC motion radius must be finite and non-negative');
  if (!Number.isFinite(seed) || typeof isSafe !== 'function' || typeof peers !== 'function')
    throw new TypeError('NPC motion requires a finite seed, isSafe and peers');
  if (heightAt !== undefined && typeof heightAt !== 'function')
    throw new TypeError('NPC motion heightAt must be a function');

  const home = center.clone(),
    rng = seededRandom(seed),
    speed = 0.22 + rng() * 0.06,
    limbs = makeLimbs(npc),
    initialGround = heightAt ? heightAt(home.x, home.z) : home.y,
    groundOffset = Number.isFinite(initialGround) ? home.y - initialGround : 0;
  npc.userData.animated = true;
  npc.position.copy(home);

  let paused = false,
    phase = 'idle',
    target = null,
    idleRemaining = 0.7 + rng() * 1.4,
    lastTime = null,
    discardNextDelta = false,
    remainder = 0,
    gait = rng() * TAU;

  const groundAt = (x, z) => {
    const y = heightAt ? heightAt(x, z) : home.y;
    return Number.isFinite(y) ? y : null;
  };

  const safePoint = (x, z, others) => {
    if (Math.hypot(x - home.x, z - home.z) > radius + 1e-9 || !isSafe(x, z)) return false;
    for (const peer of others) {
      if (!peer || peer === npc) continue;
      if (Math.hypot(x - peer.position.x, z - peer.position.z) < PEER_DISTANCE - 1e-9) return false;
    }
    return true;
  };

  // Sampling the whole route rejects a safe endpoint across a pond/wall. Main's
  // isSafe callback includes the character's footprint around each sample.
  const safeSegment = (x, z, others) => {
    const from = npc.position,
      distance = Math.hypot(x - from.x, z - from.z),
      samples = Math.max(1, Math.ceil(distance / SAMPLE_SPACING));
    let previousY = groundAt(from.x, from.z);
    if (previousY === null || !safePoint(from.x, from.z, others)) return null;
    for (let i = 1; i <= samples; i++) {
      const sx = from.x + ((x - from.x) * i) / samples,
        sz = from.z + ((z - from.z) * i) / samples,
        y = groundAt(sx, sz);
      if (
        y === null ||
        !safePoint(sx, sz, others) ||
        Math.abs(y - previousY) > (distance / samples) * MAX_SLOPE + 1e-6
      )
        return null;
      previousY = y;
    }
    return previousY + groundOffset;
  };

  const rest = () => {
    phase = 'idle';
    target = null;
    idleRemaining = 1.1 + rng() * 2.1;
  };

  const chooseTarget = () => {
    const others = peers();
    for (let attempt = 0; attempt < 20 && radius > 0; attempt++) {
      const angle = rng() * TAU,
        distance = Math.sqrt(rng()) * radius * 0.96,
        x = home.x + Math.sin(angle) * distance,
        z = home.z + Math.cos(angle) * distance;
      if (Math.hypot(x - npc.position.x, z - npc.position.z) < Math.min(0.3, radius * 0.4))
        continue;
      const y = safeSegment(x, z, others);
      if (y === null) continue;
      target = { x, y, z };
      phase = 'turn';
      return;
    }
    // An obstructed clearing stays still and retries; it never teleports out.
    idleRemaining = 0.7 + rng() * 0.8;
  };

  const advance = (delta) => {
    if (phase === 'idle') {
      idleRemaining -= delta;
      if (idleRemaining <= 0) chooseTarget();
    } else if (phase === 'turn') {
      const angle = Math.atan2(target.x - npc.position.x, target.z - npc.position.z),
        difference = Math.atan2(Math.sin(angle - npc.rotation.y), Math.cos(angle - npc.rotation.y)),
        turn = delta * 1.15;
      if (Math.abs(difference) <= turn) {
        npc.rotation.y = angle;
        phase = 'walk';
      } else npc.rotation.y += Math.sign(difference) * turn;
    } else {
      const dx = target.x - npc.position.x,
        dz = target.z - npc.position.z,
        distance = Math.hypot(dx, dz),
        step = Math.min(speed * delta, distance),
        x = distance > 0 ? npc.position.x + (dx / distance) * step : target.x,
        z = distance > 0 ? npc.position.z + (dz / distance) * step : target.z,
        y = safeSegment(x, z, peers());
      if (y === null) rest();
      else {
        npc.position.set(x, y, z);
        gait += step * 16;
        if (distance <= step + 1e-8) rest();
      }
    }
    for (const { pivot, side, kind } of limbs) {
      const desired =
        phase === 'walk' ? Math.sin(gait) * 0.25 * side * (kind === 'arm' ? -0.8 : 1) : 0;
      pivot.rotation.x += (desired - pivot.rotation.x) * Math.min(1, delta * 10);
    }
  };

  return {
    update(seconds) {
      if (!Number.isFinite(seconds)) return;
      if (lastTime === null || seconds < lastTime || paused || discardNextDelta) {
        lastTime = seconds;
        remainder = 0;
        discardNextDelta = false;
        return;
      }
      // Do not replay a background tab's missed walking or paused animation.
      remainder += Math.min(MAX_DELTA, seconds - lastTime);
      lastTime = seconds;
      while (remainder >= STEP - 1e-10) {
        advance(STEP);
        remainder = Math.max(0, remainder - STEP);
      }
    },
    setPaused(value) {
      const next = Boolean(value);
      if (paused === next) return;
      paused = next;
      remainder = 0;
      // setPaused has no timestamp. Baseline the first resumed call even if
      // no update ran while the Modal was open.
      discardNextDelta = !paused;
    },
    getState() {
      return { paused, phase, target: target ? { ...target } : null };
    },
  };
}
