import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Group, Vector3 } from 'three';
import { createVisitors } from '../src/world/visitors.js';
import { createVisitorNavigation, VISITOR_DECK } from '../src/world/visitor-navigation.js';
import { createTerrain } from '../src/world/terrain.js';
import { createBridge, findShore } from '../src/world/bridge.js';
import { box } from '../src/world/primitives.js';
import { batchStatic, disposeScene } from '../src/world/optimize.js';
import { createIslandScene } from '../src/scene.js';
import { createDemoManifest, demoFixture } from '../src/demo/fixture.js';

const horizontal = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
function simpleWorld(open = ['S01', 'S02', 'S03'], obstacles = true) {
  const world = new Group(),
    records = new Map();
  const make = (id, x, z, seed) => {
    const root = new Group(),
      built = createTerrain({ radius: 4.8, seed, stretch: 1 });
    root.position.set(x, 0, z);
    root.add(built.group);
    world.add(root);
    if (obstacles) {
      box(root, '#c49f79', [-1, 1.8, -0.8], [1.5, 1.8, 1.5]);
      const pond = box(root, '#6cbeb7', [1.8, 0.99, 0.1], [0.7, 0.05, 1.2]);
      pond.userData.water = true;
    }
    return {
      root,
      terrain: built.body,
      top: 0.8,
      preset: { id },
      unlocked: open.includes(id),
      npcs: [],
    };
  };
  const academy = make('academy', 0, 0, 6);
  records.set('S01', make('S01', 13, 0, 12));
  records.set('S02', make('S02', 26, 0, 17));
  records.set('S03', make('S03', 13, 13, 23));
  for (const [id, record] of records) {
    const from = id === 'S01' ? 'academy' : 'S01',
      parent = from === 'academy' ? academy : records.get(from);
    const built = createBridge(
      findShore(parent.terrain, record.root.position),
      findShore(record.terrain, parent.root.position),
    );
    world.add(built.group);
    record.link = { from, to: id, curve: built.curve, bridge: built.group };
  }
  return { root: world, academy: academy.root, records };
}
function step(crowd, duration, hz = 6) {
  for (let i = 0; i <= duration * hz; i++) crowd.update(i / hz);
}
function assertRoute(navigation, segments) {
  for (const segment of segments) {
    if (segment.kind === 'bridge') {
      assert.ok(navigation.allowedIds.includes(segment.from));
      assert.ok(navigation.allowedIds.includes(segment.to));
      continue;
    }
    const island = navigation.islands.get(segment.unitId);
    for (let i = 1; i < segment.points.length; i++)
      assert.ok(
        island.safeSegment(segment.points[i - 1], segment.points[i]),
        `${segment.unitId} safe ground segment`,
      );
  }
}

test('no published units means no visitors, and disconnected units cannot traverse a locked parent', () => {
  const empty = simpleWorld([]),
    none = createVisitors(empty);
  assert.equal(none.visitors.length, 0);
  assert.deepEqual(none.snapshot(), []);
  assert.deepEqual(none.navigation.allowedIds, []);
  none.update(100);
  disposeScene(empty.root);
  const world = simpleWorld(['S02', 'S03']),
    crowd = createVisitors(world);
  assert.equal(crowd.visitors.length, 3);
  assert.equal(crowd.navigation.islandPath('S02', 'S03'), null);
  assert.equal(crowd.navigation.islandPath('S02', 'academy'), null);
  assert.equal(crowd.navigation.edges.length, 0);
  step(crowd, 35);
  for (const state of crowd.snapshot()) {
    assert.ok(['S02', 'S03'].includes(state.unitId));
    assert.notEqual(state.phase, 'bridge');
  }
  disposeScene(world.root);
  disposeScene(crowd.root);
});

test('ground grid routes around water/buildings with cardinal neighbors and real height', () => {
  const world = simpleWorld(),
    nav = createVisitorNavigation(world);
  assert.equal(nav.edges.filter((edge) => edge.enabled).length, 3);
  for (const island of nav.islands.values()) {
    for (const node of island.nodes) {
      assert.ok(island.isSafe(node.position.x, node.position.z));
      for (const next of node.neighbors) {
        const other = island.nodes[next];
        assert.equal(Math.abs(node.ix - other.ix) + Math.abs(node.iz - other.iz), 1);
      }
    }
  }
  const a = nav.islands.get('S02'),
    b = nav.islands.get('S03'),
    route = nav.plan(
      'S02',
      'S03',
      a.nodes[a.components[a.mainComponent][0]].position,
      b.nodes[b.components[b.mainComponent][0]].position,
    );
  assert.ok(route);
  assertRoute(nav, route);
  assert.deepEqual(
    route.filter((segment) => segment.kind === 'bridge').map(({ from, to }) => [from, to]),
    [
      ['S02', 'S01'],
      ['S01', 'S03'],
    ],
  );
  const unit = world.records.get('S01').root;
  assert.equal(
    nav.islands.get('S01').isSafe(unit.position.x + 1.8, 0.1),
    false,
    'pond is not walkable',
  );
  assert.equal(
    nav.islands.get('S01').isSafe(unit.position.x - 1, -0.8),
    false,
    'building is not walkable',
  );
  disposeScene(world.root);
});

test('tourists cross exact existing centerlines early, visit multiple units, and return', () => {
  const world = simpleWorld(),
    crowd = createVisitors(world),
    first = crowd.snapshot()[0],
    visited = new Set(),
    phases = new Set();
  let firstBridge = null,
    returned = false;
  for (let i = 0; i <= 240 * 6; i++) {
    crowd.update(i / 6);
    const states = crowd.snapshot();
    for (const state of states) {
      phases.add(state.phase);
      if (state.phase === 'bridge') {
        firstBridge ??= i / 6;
        const edge = crowd.navigation.edges.find(
            (edge) =>
              [edge.from, edge.to].includes(state.from) && [edge.from, edge.to].includes(state.to),
          ),
          expected = edge.curve.getPointAt(state.bridgeT).add(new Vector3(0, VISITOR_DECK, 0));
        assert.ok(new Vector3(...state.position).distanceTo(expected) < 1e-8);
      } else {
        const island = crowd.navigation.islands.get(state.unitId);
        assert.ok(
          island.isSafe(state.position[0], state.position[2]),
          JSON.stringify({ time: i / 6, state }),
        );
      }
    }
    const state = states[0];
    state.visited.forEach((id) => visited.add(id));
    returned ||= state.trips >= 3 && state.unitId === first.home;
  }
  assert.ok(firstBridge < 10, `first crossing at ${firstBridge}`);
  assert.ok(visited.size >= 3, `visited ${[...visited]}`);
  assert.ok(returned, 'the first tourist returns home after its loop');
  assert.ok(phases.has('dwell') && phases.has('bridge') && phases.has('walk'));
  disposeScene(world.root);
  disposeScene(crowd.root);
});

test('single open island makes a safe academy transit loop without dwelling there', () => {
  const world = simpleWorld(['S01']),
    crowd = createVisitors(world);
  let crossed = false,
    returned = false;
  for (let i = 0; i <= 100 * 6; i++) {
    crowd.update(i / 6);
    for (const state of crowd.snapshot()) {
      crossed ||= state.phase === 'bridge';
      returned ||= state.trips >= 1;
      if (state.unitId === 'academy') assert.notEqual(state.phase, 'dwell');
      if (state.phase === 'bridge')
        assert.ok(['S01', 'academy'].includes(state.from) && ['S01', 'academy'].includes(state.to));
    }
  }
  assert.ok(crossed && returned);
  disposeScene(world.root);
  disposeScene(crowd.root);
});

test('opposing bridge queues yield without deadlock, and followers keep a gap', () => {
  const world = simpleWorld(['S01'], false),
    crowd = createVisitors(world);
  let following = false,
    bothDirections = new Set();
  for (let i = 0; i <= 220 * 6; i++) {
    crowd.update(i / 6);
    const crossing = crowd.snapshot().filter((state) => state.phase === 'bridge');
    for (const state of crossing) bothDirections.add(`${state.from}/${state.to}`);
    for (let a = 0; a < crossing.length; a++)
      for (let b = a + 1; b < crossing.length; b++) {
        following = true;
        assert.equal(
          crossing[a].from,
          crossing[b].from,
          'opposite queues never own the same bridge',
        );
        assert.ok(
          horizontal(crossing[a].position, crossing[b].position) >= 0.6,
          'followers retain a gap',
        );
      }
  }
  assert.ok(following && bothDirections.size === 2);
  for (const state of crowd.snapshot())
    assert.ok(state.trips >= 1, `${state.id} completes its trip`);
  disposeScene(world.root);
  disposeScene(crowd.root);
});

test('6 Hz and 60 Hz use the same bounded deterministic clock, including invalid and late times', () => {
  const a = simpleWorld(),
    b = simpleWorld(),
    near = createVisitors(a),
    far = createVisitors(b);
  step(near, 40, 60);
  step(far, 40, 6);
  for (let i = 0; i < near.visitors.length; i++)
    assert.ok(near.visitors[i].position.distanceTo(far.visitors[i].position) < 1e-7);
  const before = far.snapshot();
  for (const value of [NaN, Infinity, -Infinity, 40, 3]) far.update(value);
  assert.deepEqual(far.snapshot(), before);
  far.update(1e6);
  for (let i = 0; i < before.length; i++)
    assert.ok(horizontal(before[i].position, far.snapshot()[i].position) <= 0.72 * 0.25 + 1e-7);
  for (const world of [a, b]) disposeScene(world.root);
  disposeScene(near.root);
  disposeScene(far.root);
});

test('local batching retains small unmarked tourists, limb movement and frozen CPU ground', () => {
  const world = simpleWorld(),
    crowd = createVisitors(world),
    initial = crowd.snapshot();
  world.root.add(crowd.root);
  for (const record of world.records.values()) batchStatic(record.root);
  batchStatic(world.academy);
  for (const visitor of crowd.visitors) {
    const height = new Box3().setFromObject(visitor).getSize(new Vector3()).y;
    assert.ok(height > 1 && height < 1.2);
    assert.ok(visitor.children.filter((child) => child.isMesh).length <= 1);
    batchStatic(visitor);
    visitor.traverse((object) => {
      assert.equal(object.userData.decoration, true);
      assert.equal(object.userData.action, undefined);
      assert.ok(!/Q\d/.test(object.name));
    });
  }
  step(crowd, 12);
  assert.ok(
    crowd.snapshot().some((state, i) => horizontal(state.position, initial[i].position) > 1),
  );
  assert.ok(
    crowd.visitors.some((visitor) =>
      visitor.children.some(
        (child) => child.name === 'visitor-leg' && Math.abs(child.rotation.x) > 0.01,
      ),
    ),
  );
  for (const island of crowd.navigation.islands.values())
    for (const node of island.nodes.slice(0, 5))
      assert.ok(island.isSafe(node.position.x, node.position.z));
  const snapshot = crowd.snapshot();
  snapshot[0].position[0] = 1e6;
  snapshot[0].visited.push('locked');
  assert.notEqual(crowd.snapshot()[0].position[0], 1e6);
  assert.ok(!crowd.snapshot()[0].visited.includes('locked'));
  disposeScene(world.root);
});

test('tourists yield around a moving question root without changing its transform or state', () => {
  const world = simpleWorld(['S01']),
    record = world.records.get('S01'),
    npc = new Group();
  npc.userData.animated = true;
  npc.userData.paused = true;
  npc.name = 'npc-Q01';
  record.root.add(npc);
  record.npcs.push(npc);
  npc.position.set(-2, 0.95, 2);
  const crowd = createVisitors(world);
  crowd.update(0);
  const visitor = crowd.visitors[0],
    local = record.root.worldToLocal(visitor.position.clone());
  npc.position.copy(local).add(new Vector3(0.25, 0, 0));
  const before = npc.position.clone(),
    rotation = npc.rotation.clone();
  for (let i = 1; i <= 60; i++) crowd.update(i / 60);
  assert.ok(
    visitor.position.distanceTo(npc.getWorldPosition(new Vector3())) > 0.6,
    'tourist steps aside from question root',
  );
  assert.ok(npc.position.equals(before));
  assert.ok(npc.rotation.equals(rotation));
  assert.equal(npc.userData.paused, true);
  for (let i = 0; i < crowd.visitors.length; i++)
    for (let j = i + 1; j < crowd.visitors.length; j++)
      assert.ok(crowd.visitors[i].position.distanceTo(crowd.visitors[j].position) > 0.55);
  disposeScene(world.root);
  disposeScene(crowd.root);
});

for (const totalUnits of [1, 12, 15])
  test(`real ${totalUnits}-theme quiz terrain remains safe after batching at overview cadence`, () => {
    const fixture = {
        ...demoFixture,
        questions: [
          ...demoFixture.questions,
          { id: 'Q05', color: '#739bb8', position: [3.6, 0.1] },
        ],
      },
      world = createIslandScene(
        { courseTitle: '訪客測試', totalUnits, assignmentMode: 'quiz' },
        fixture,
        { manifest: createDemoManifest(totalUnits, totalUnits) },
      ),
      crowd = world.visitors;
    world.optimize();
    assert.ok(crowd.visitors.length >= 3 && crowd.visitors.length <= 8);
    let crossing = false;
    for (let frame = 0; frame <= 20 * 6; frame++) {
      world.update(frame / 6, 'overview', 8);
      for (const state of crowd.snapshot()) {
        if (state.phase === 'bridge') {
          crossing = true;
          assert.ok(crowd.navigation.allowedIds.includes(state.from));
          assert.ok(crowd.navigation.allowedIds.includes(state.to));
        } else
          assert.ok(
            crowd.navigation.islands.get(state.unitId).isSafe(state.position[0], state.position[2]),
            JSON.stringify({ time: frame / 6, state }),
          );
      }
    }
    assert.ok(crossing);
    assert.ok(crowd.visitors.every((visitor) => visitor.userData.animated));
    assert.ok(
      world.pickables.every(
        (object) => !object.userData.visitor && !object.parent?.userData.visitor,
      ),
    );
    world.dispose();
  });
