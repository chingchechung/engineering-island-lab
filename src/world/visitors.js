import { Group, Vector3 } from 'three';
import { ball, box, cylinder, random } from './primitives.js';
import { batchStatic } from './optimize.js';
import { createVisitorNavigation, VISITOR_DECK, VISITOR_FOOT } from './visitor-navigation.js';

const STEP = 1 / 60;
const MAX_DELTA = 0.25;
const TAU = Math.PI * 2;
const DISTANCE = 0.62;
const horizontal = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const COATS = [
  '#d67d65',
  '#6d9fbd',
  '#b795c4',
  '#d6af5e',
  '#76a58c',
  '#d99cb2',
  '#7790b6',
  '#b89a76',
];

function tourist(index) {
  const root = new Group(),
    limbs = [];
  root.name = `visitor-${index + 1}`;
  root.userData.decoration = true;
  root.userData.animated = true;
  root.userData.visitor = true;
  // A small backpack, cap and unmarked clothes distinguish these tourists
  // from the larger, numbered question NPCs. Total height is about 1.1 units.
  ball(root, COATS[index], [0, 0.43, 0], [0.22, 0.27, 0.17], 8);
  box(root, '#c6ae87', [0, 0.45, -0.16], [0.23, 0.26, 0.12]);
  const skin = index % 3 === 0 ? '#d4a282' : index % 3 === 1 ? '#f0c7a3' : '#b88869';
  ball(root, skin, [0, 0.8, 0.01], [0.22, 0.23, 0.21], 9);
  ball(root, '#665951', [0, 0.92, -0.04], [0.225, 0.13, 0.2], 8);
  if (index % 2 === 0) {
    cylinder(root, '#f0d9a0', [0, 0.96, 0], 0.29, 0.04, 10);
    ball(root, COATS[(index + 3) % COATS.length], [0, 1, -0.02], [0.2, 0.09, 0.19], 8);
  } else {
    ball(root, COATS[index], [0, 0.98, -0.02], [0.23, 0.12, 0.2], 8);
    box(root, COATS[index], [0, 0.96, 0.2], [0.26, 0.025, 0.14]);
  }
  for (const side of [-1, 1]) {
    ball(root, '#35494b', [side * 0.075, 0.82, 0.205], [0.024, 0.031, 0.014], 6);
    const leg = new Group();
    leg.name = 'visitor-leg';
    leg.userData.animated = true;
    leg.position.set(side * 0.09, 0.29, 0);
    root.add(leg);
    box(leg, '#66777e', [0, -0.09, 0], [0.1, 0.19, 0.11]);
    ball(leg, '#665958', [0, -0.24, 0.045], [0.082, 0.053, 0.125], 7);
    const arm = new Group();
    arm.name = 'visitor-arm';
    arm.userData.animated = true;
    arm.position.set(side * 0.22, 0.56, 0);
    root.add(arm);
    ball(arm, skin, [side * 0.015, -0.12, 0], [0.055, 0.15, 0.065], 7);
    limbs.push({ pivot: leg, side, arm: false }, { pivot: arm, side, arm: true });
  }
  root.traverse((object) => {
    object.userData.decoration = true;
  });
  // Baking happens only in each movable local frame, never in world space.
  batchStatic(root);
  for (const { pivot } of limbs) batchStatic(pivot);
  return { root, limbs };
}

/** Noninteractive scenery. update takes absolute seconds at either 60 Hz or 6 Hz. */
export function createVisitors({ academy, records, seed = 73 }) {
  if (!Number.isFinite(seed)) throw new TypeError('Visitor seed must be finite');
  const navigation = createVisitorNavigation({ academy, records }),
    root = new Group(),
    visitors = [],
    states = [],
    rng = random(seed),
    open = [...records].filter(
      ([id, record]) => record.unlocked && navigation.islands.get(id)?.nodes.length,
    );
  root.name = 'background-visitors';
  root.userData.decoration = true;
  root.userData.animated = true;
  const count = open.length ? Math.min(8, 3 + Math.floor(open.length / 3)) : 0;
  const npcPoints = () =>
    [...records.values()].flatMap((record) =>
      (record.npcs ?? []).map((npc) => npc.getWorldPosition(new Vector3())),
    );
  function availableNodes(unitId, awayFrom = []) {
    const island = navigation.islands.get(unitId);
    return island.nodes.filter(
      (node) =>
        node.component === island.mainComponent &&
        awayFrom.every((point) => horizontal(node.position, point) > (point.radius ?? 0.85)),
    );
  }
  function destination(unitId, current, others) {
    const nodes = availableNodes(unitId, others).filter(
      (node) => horizontal(node.position, current) > 0.8,
    );
    return nodes.length
      ? nodes[Math.floor(rng() * nodes.length)].position.clone()
      : current.clone();
  }
  for (let i = 0; i < count; i++) {
    const [unitId] = open[i % open.length],
      island = navigation.islands.get(unitId),
      edge = navigation.adjacency
        .get(unitId)
        .find(
          (link) =>
            (link.from === unitId ? link.startNode : link.endNode).component ===
            island.mainComponent,
        ),
      dock = edge ? (edge.from === unitId ? edge.startNode : edge.endNode).position : null,
      others = [...npcPoints(), ...visitors.map((visitor) => visitor.position)],
      nodes = availableNodes(unitId, others);
    if (!nodes.length) continue;
    // The first visitor starts on verified land near the dock, so ordinary
    // Demo observation includes a crossing without a long initial island lap.
    const start =
      dock && i === 0
        ? [...nodes].sort((a, b) => horizontal(a.position, dock) - horizontal(b.position, dock))[0]
        : nodes[Math.floor(rng() * nodes.length)];
    const built = tourist(i);
    built.root.position.copy(start.position);
    built.root.rotation.y = rng() * TAU;
    root.add(built.root);
    visitors.push(built.root);
    states.push({
      id: built.root.name,
      object: built.root,
      limbs: built.limbs,
      home: unitId,
      unitId,
      phase: 'dwell',
      from: unitId,
      to: unitId,
      wait: 0.6 + i * 0.75,
      speed: 0.64 + rng() * 0.08,
      segments: [],
      segmentIndex: 0,
      pointIndex: 1,
      progress: 0,
      gait: rng() * TAU,
      trips: 0,
      blocked: 0,
      replanned: 0,
      visited: new Set([unitId]),
      target: null,
      bridgeT: null,
    });
  }

  function chooseTrip(state, npcs) {
    const reachable = open
        .map(([id]) => id)
        .filter((id) => id !== state.unitId && navigation.islandPath(state.unitId, id)),
      returnHome = state.trips % 3 === 2 && state.home !== state.unitId;
    // Multiple destinations, academy transit and regular returns all use the
    // same filtered BFS; a locked parent never becomes a transit shortcut.
    const target = returnHome
        ? state.home
        : reachable.length
          ? reachable[(states.indexOf(state) + state.trips) % reachable.length]
          : state.unitId,
      next = destination(target, state.object.position, [
        ...npcs,
        ...visitors.filter((v) => v !== state.object).map((v) => v.position),
      ]);
    let plan = navigation.plan(state.unitId, target, state.object.position, next);
    if (
      !reachable.length &&
      navigation.islandPath(state.unitId, 'academy', state.object.position)
    ) {
      const edges = navigation.islandPath(state.unitId, 'academy', state.object.position),
        last = edges.at(-1),
        academyIsland = navigation.islands.get('academy'),
        dock = last.from === 'academy' ? last.startNode : last.endNode,
        transit = academyIsland.nodes.filter(
          (node) =>
            node.component === dock.component && horizontal(node.position, dock.position) > 1.2,
        ),
        turn = (transit[Math.floor(rng() * transit.length)] ?? dock).position,
        outward = navigation.plan(state.unitId, 'academy', state.object.position, turn),
        inward = navigation.plan('academy', state.unitId, turn, next);
      if (outward && inward) plan = [...outward, ...inward];
    }
    if (!plan) {
      state.wait = 1.5;
      return;
    }
    state.segments = plan;
    state.segmentIndex = 0;
    state.pointIndex = 1;
    state.progress = 0;
    state.from = state.unitId;
    state.to = target;
    state.target = target;
    state.phase = 'walk';
    state.blocked = 0;
  }
  function completeSegment(state) {
    const segment = state.segments[state.segmentIndex];
    if (segment.kind === 'bridge') {
      state.unitId = segment.to;
      if (segment.to !== 'academy') state.visited.add(segment.to);
    }
    state.segmentIndex++;
    state.pointIndex = 1;
    state.progress = 0;
    state.bridgeT = null;
    if (state.segmentIndex === state.segments.length) {
      state.phase = 'dwell';
      state.wait = 1.5 + rng() * 3;
      state.trips++;
      state.target = null;
      state.from = state.unitId;
      state.to = state.unitId;
    } else {
      const next = state.segments[state.segmentIndex];
      state.phase = next.kind === 'ground' ? 'walk' : 'yield';
      state.from = next.kind === 'ground' ? next.unitId : next.from;
      state.to = next.kind === 'ground' ? state.target : next.to;
    }
  }
  function groundHeight(segment, position) {
    const island = navigation.islands.get(segment.unitId),
      y = island.heightAt(position.x, position.z);
    if (y === null) return position.y;
    // Blend the tiny bank/deck step at the real bridge end. The curve already
    // includes the original deck's vertical and lateral shape.
    let result = y + VISITOR_FOOT;
    for (const endpoint of [segment.points[0], segment.points.at(-1)])
      if (endpoint.y > (island.heightAt(endpoint.x, endpoint.z) ?? endpoint.y) + 0.1) {
        const weight = Math.max(0, 1 - horizontal(position, endpoint) / 0.55);
        result = Math.max(result, result + (endpoint.y - result) * weight);
      }
    return result;
  }
  function animate(state, delta, walking, distance) {
    state.gait += distance * 17;
    for (const { pivot, side, arm } of state.limbs) {
      const target = walking ? Math.sin(state.gait) * 0.3 * side * (arm ? -0.8 : 1) : 0;
      pivot.rotation.x += (target - pivot.rotation.x) * Math.min(1, delta * 10);
    }
  }
  function advance(state, delta, npcs) {
    if (state.phase === 'dwell') {
      const at = state.object.position,
        island = navigation.islands.get(state.unitId),
        close = npcs.filter((other) => horizontal(at, other) < 0.85);
      let moved = 0;
      if (close.length) {
        const away = new Vector3();
        for (const other of close)
          away.add(new Vector3(at.x - other.x, 0, at.z - other.z).normalize());
        if (away.lengthSq() < 0.001) away.set(Math.sin(state.gait), 0, Math.cos(state.gait));
        away.normalize();
        for (const angle of [0, 0.8, -0.8, 1.5, -1.5]) {
          const next = at
            .clone()
            .addScaledVector(
              away.clone().applyAxisAngle(new Vector3(0, 1, 0), angle),
              state.speed * delta,
            );
          if (
            !island.safeSegment(at, next) ||
            npcs.some(
              (other) => horizontal(next, other) < Math.min(0.85, horizontal(at, other)) - 1e-6,
            ) ||
            visitors.some(
              (other) => other !== state.object && horizontal(next, other.position) < DISTANCE,
            )
          )
            continue;
          next.y = island.heightAt(next.x, next.z) + VISITOR_FOOT;
          at.copy(next);
          moved = state.speed * delta;
          break;
        }
      }
      state.wait -= delta;
      if (state.wait <= 0) chooseTrip(state, npcs);
      animate(state, delta, moved > 0, moved);
      return;
    }
    const segment = state.segments[state.segmentIndex];
    if (!segment) return;
    const before = state.object.position.clone(),
      others = [
        ...npcs.map((p) => ({ ...p, radius: 0.75 })),
        ...states
          .filter((s) => s !== state)
          .map((s) => ({ ...s.object.position, radius: DISTANCE, visitor: s })),
      ];
    let candidate, distance, step;
    if (segment.kind === 'bridge') {
      state.from = segment.from;
      state.to = segment.to;
      const direction = segment.reverse ? -1 : 1,
        nextProgress = Math.min(segment.length, state.progress + state.speed * delta),
        t = segment.reverse ? 1 - nextProgress / segment.length : nextProgress / segment.length;
      candidate = segment.curve.getPointAt(t).add(new Vector3(0, VISITOR_DECK, 0));
      step = nextProgress - state.progress;
      // A bridge is a single-file lane. Reserve its direction until clear,
      // and let followers retain a visible gap on the exact centerline.
      const headOn = states.some((other) => {
        if (other === state || other.phase !== 'bridge' || other.progress <= 0) return false;
        const theirs = other.segments[other.segmentIndex];
        return theirs?.curve === segment.curve && theirs.reverse !== segment.reverse;
      });
      const blocked =
        headOn ||
        others.some(
          (other) =>
            horizontal(candidate, other) < other.radius &&
            horizontal(candidate, other) < horizontal(before, other) - 1e-6,
        );
      if (!blocked) {
        state.phase = 'bridge';
        state.object.position.copy(candidate);
        state.progress = nextProgress;
        state.bridgeT = t;
        const tangent = segment.curve.getTangentAt(t).multiplyScalar(direction);
        state.object.rotation.y = Math.atan2(tangent.x, tangent.z);
        if (state.progress >= segment.length - 1e-9) completeSegment(state);
      } else if (state.progress === 0) state.phase = 'yield';
      animate(state, delta, !blocked, blocked ? 0 : step);
      return;
    }
    state.phase = 'walk';
    state.from = segment.unitId;
    state.to = state.target;
    const goal = segment.points[state.pointIndex],
      island = navigation.islands.get(segment.unitId);
    if (!goal) {
      completeSegment(state);
      animate(state, delta, false, 0);
      return;
    }
    distance = horizontal(before, goal);
    step = Math.min(state.speed * delta, distance);
    candidate = distance > 1e-9 ? before.clone().lerp(goal, step / distance) : goal.clone();
    candidate.y = groundHeight(segment, candidate);
    const nextSegment = state.segments[state.segmentIndex + 1],
      occupiedBridge =
        nextSegment?.kind === 'bridge' &&
        states.some((other) => {
          const theirs = other.segments[other.segmentIndex];
          return (
            other !== state &&
            other.phase === 'bridge' &&
            theirs?.curve === nextSegment.curve &&
            theirs.reverse !== nextSegment.reverse
          );
        }),
      blocked =
        !island.safeSegment(before, candidate) ||
        (occupiedBridge && horizontal(candidate, segment.points.at(-1)) < 0.85) ||
        others.some(
          (other) =>
            horizontal(candidate, other) < other.radius &&
            horizontal(candidate, other) < horizontal(before, other) - 1e-6,
        );
    if (!blocked) {
      state.object.position.copy(candidate);
      if (distance > 1e-8)
        state.object.rotation.y = Math.atan2(goal.x - before.x, goal.z - before.z);
      state.blocked = 0;
      if (distance <= step + 1e-8) {
        state.pointIndex++;
        if (state.pointIndex >= segment.points.length) completeSegment(state);
      }
    } else {
      state.phase = 'yield';
      state.blocked += delta;
      state.replanned += delta;
      // A walking question NPC can enter a waiting tourist's personal space.
      // Only the tourist moves aside; question roots and pause state are read-only.
      const close = others.filter((other) => horizontal(before, other) < other.radius + 0.1);
      let moved = false;
      if (close.length) {
        const away = new Vector3();
        for (const other of close)
          away.add(new Vector3(before.x - other.x, 0, before.z - other.z).normalize());
        if (away.lengthSq() < 0.001) away.set(Math.sin(state.gait), 0, Math.cos(state.gait));
        away.normalize();
        for (const angle of [0, 0.7, -0.7, 1.4, -1.4]) {
          const shift = away.clone().applyAxisAngle(new Vector3(0, 1, 0), angle),
            sidestep = before.clone().addScaledVector(shift, state.speed * delta);
          if (
            !island.safeSegment(before, sidestep) ||
            others.some(
              (other) =>
                horizontal(sidestep, other) <
                Math.min(other.radius, horizontal(before, other)) - 1e-6,
            )
          )
            continue;
          sidestep.y = groundHeight(segment, sidestep);
          state.object.position.copy(sidestep);
          moved = true;
          break;
        }
      }
      if (state.replanned >= 0.65 || moved) {
        const avoid = others.filter(
            (other) => horizontal(state.object.position, other) >= other.radius,
          ),
          points = island.path(state.object.position, segment.points.at(-1), avoid);
        if (points) {
          segment.points = points;
          state.pointIndex = 1;
        }
        state.replanned = 0;
      }
      animate(state, delta, moved, moved ? state.speed * delta : 0);
      return;
    }
    animate(state, delta, true, step);
  }
  let lastTime = null,
    remainder = 0;
  return {
    root,
    visitors,
    navigation,
    update(seconds) {
      if (!Number.isFinite(seconds)) return;
      if (lastTime === null || seconds < lastTime) {
        lastTime = seconds;
        remainder = 0;
        return;
      }
      remainder += Math.min(MAX_DELTA, seconds - lastTime);
      lastTime = seconds;
      const npcs = npcPoints();
      while (remainder >= STEP - 1e-10) {
        for (const state of states) advance(state, STEP, npcs);
        remainder = Math.max(0, remainder - STEP);
      }
    },
    snapshot() {
      return states.map((state) => ({
        id: state.id,
        unitId: state.unitId,
        phase: state.phase,
        from: state.from,
        to: state.to,
        position: state.object.position.toArray(),
        home: state.home,
        trips: state.trips,
        visited: [...state.visited],
        bridgeT: state.bridgeT,
      }));
    },
  };
}
