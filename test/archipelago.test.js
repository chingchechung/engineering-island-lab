import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Raycaster, Vector2, Vector3 } from 'three';
import { createIslandScene } from '../src/scene.js';
import { CameraRig } from '../src/camera.js';
import { demoFixture, createDemoManifest } from '../src/demo/fixture.js';
import { PRESETS } from '../src/world/presets.js';
const course = { courseTitle: '數位電子學', totalUnits: 12, assignmentMode: 'quiz' };
function make(totalUnits = 12, openCount = 4, assignmentMode = 'quiz') {
  return createIslandScene({ ...course, totalUnits, assignmentMode }, demoFixture, {
    manifest: createDemoManifest(totalUnits, openCount),
  });
}
for (const totalUnits of [1, 12, 15]) {
  test(`${totalUnits} units have a connected bridge tree, exact unit range, distinct scenery and one academy`, () => {
    const w = make(totalUnits);
    assert.equal(w.islands.children.length, totalUnits + 1);
    assert.equal(w.records.size, totalUnits);
    assert.equal(w.bridges.length, totalUnits);
    assert.equal(w.records.has('S13'), totalUnits >= 13);
    assert.equal(w.records.has('S15'), totalUnits === 15);
    for (const [id, r] of w.records) {
      assert.ok(r.house);
      assert.ok(r.animals.length);
      assert.equal(r.unlocked, Number(id.slice(1)) <= Math.min(4, totalUnits));
      assert.equal(Boolean(r.gate), !r.unlocked);
      let parent = r.link.from,
        depth = 0;
      while (parent !== 'academy') {
        parent = w.records.get(parent).link.from;
        assert.ok(++depth < totalUnits);
      }
    }
    w.dispose();
  });
  for (const aspect of [1366 / 453, 1920 / 765, 390 / 459])
    test(`overview fits every ${totalUnits}-unit world at aspect ${aspect.toFixed(2)}`, () => {
      const w = make(totalUnits),
        rig = new CameraRig(w.bounds, aspect);
      for (const x of [w.bounds.min.x, w.bounds.max.x])
        for (const y of [w.bounds.min.y, w.bounds.max.y])
          for (const z of [w.bounds.min.z, w.bounds.max.z]) {
            const p = new Vector3(x, y, z).project(rig.camera);
            assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
          }
      for (const [id] of w.records) {
        rig.focus(id, w.focusBounds(id));
        rig.update(3);
        assert.equal(rig.view, id);
        assert.ok(rig.camera.zoom > 1.3);
      }
      w.dispose();
    });
}
test('all bridge ends rest on actual island terrain and island bodies never overlap', () => {
  const w = make(15);
  for (const [id, r] of w.records) {
    const from = r.link.from === 'academy' ? w.academy : w.records.get(r.link.from).root;
    const terrains = [from.getObjectByName('coast-and-cliffs'), r.terrain];
    for (const [i, t] of [0, 1].entries()) {
      const end = r.link.curve.getPointAt(t),
        ray = new Raycaster(end.clone().add(new Vector3(0, 5, 0)), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(terrains[i])[0];
      assert.ok(hit, `${id} end ${i} lands on a bank`);
      assert.ok(end.y - hit.point.y >= 0 && end.y - hit.point.y < 0.35);
    }
  }
  const roots = [w.academy, ...[...w.records.values()].map((r) => r.root)];
  for (let i = 0; i < roots.length; i++)
    for (let j = i + 1; j < roots.length; j++)
      assert.equal(
        new Box3().setFromObject(roots[i]).intersectsBox(new Box3().setFromObject(roots[j])),
        false,
      );
  w.dispose();
});
test('15 themes change terrain geometry and landmarks, rather than recolouring one mesh', () => {
  const w = make(15),
    signatures = new Set();
  for (const [id, r] of w.records) {
    const positions = r.terrain.geometry.getAttribute('position');
    let fingerprint = '';
    for (let i = 0; i < positions.count; i += 37)
      fingerprint += `${positions.getX(i).toFixed(2)},${positions.getY(i).toFixed(2)},${positions.getZ(i).toFixed(2)};`;
    signatures.add(fingerprint);
    if (id !== 'S01') assert.ok(r.root.getObjectByName(`landmark-${id}`).children.length > 0);
  }
  assert.equal(signatures.size, 15);
  assert.equal(new Set(PRESETS.map((p) => p.title)).size, 15);
  w.dispose();
});
test('Manifest controls fences and content targets independently of fixture presence', () => {
  for (const openCount of [0, 4, 15]) {
    const w = make(15, openCount);
    assert.equal(w.npcs.length, openCount * 4);
    for (const [id, r] of w.records) {
      assert.equal(Boolean(r.gate), !w.isOpen(id));
      assert.equal(
        w.pickables.some(
          (o) => o.userData.action.type === 'lecture' && o.userData.action.unitId === id,
        ),
        w.isOpen(id),
      );
      assert.equal(
        w.pickables.some(
          (o) => o.userData.action.type === 'npc' && o.userData.action.unitId === id,
        ),
        w.isOpen(id),
      );
    }
    w.dispose();
  }
});
test('video-only creates no NPC geometry, labels or targets on any island', () => {
  const w = make(15, 15, 'video-only');
  assert.equal(w.npcs.length, 0);
  assert.ok(!w.labels.some((l) => ['question', 'badge'].includes(l.kind)));
  assert.ok(!w.pickables.some((o) => o.userData.action.type === 'npc'));
  assert.equal(w.animals.length, 16);
  w.dispose();
});
test('five visual NPCs fit every opened theme without exposing actual assignments', () => {
  const fixture = {
    ...demoFixture,
    questions: [
      ...demoFixture.questions,
      { id: 'Q05', name: '小嶼', color: '#739bb8', position: [3.6, 0.1] },
    ],
  };
  const w = createIslandScene({ ...course, totalUnits: 15 }, fixture, {
    manifest: createDemoManifest(15, 15),
  });
  assert.equal(w.npcs.length, 75);
  assert.equal(w.labels.filter((l) => l.kind === 'question' && l.text === 'Q05').length, 15);
  w.dispose();
});
test('static batching preserves actions and all animals remain autonomous and unpickable', () => {
  const w = make(15),
    before = new Set(w.pickables.map((o) => JSON.stringify(o.userData.action)));
  let a = 0,
    b = 0;
  w.scene.traverse((o) => {
    if (o.isMesh) a++;
  });
  w.optimize();
  w.scene.traverse((o) => {
    if (o.isMesh) b++;
  });
  assert.ok(b < a * 0.5);
  assert.deepEqual(new Set(w.pickables.map((o) => JSON.stringify(o.userData.action))), before);
  const positions = w.animals.map((a) => a.position.clone());
  w.update(0.7, 'S01', 35);
  w.animals.forEach((animal, i) => {
    assert.ok(animal.position.distanceTo(positions[i]) > 0.01);
    animal.traverse((o) => assert.ok(!w.pickables.includes(o)));
  });
  for (const bridge of w.bridges) bridge.traverse((o) => assert.ok(!w.pickables.includes(o)));
  w.dispose();
});

test('all 75 NPC bodies remain visible and pickable after batching and themed animal animation', () => {
  const fixture = {
    ...demoFixture,
    questions: [
      ...demoFixture.questions,
      { id: 'Q05', name: '小嶼', color: '#739bb8', position: [3.6, 0.1] },
    ],
  };
  const w = createIslandScene({ ...course, totalUnits: 15 }, fixture, {
    manifest: createDemoManifest(15, 15),
  });
  w.optimize();
  const rig = new CameraRig(w.bounds, 1366 / 453);
  for (const [id, record] of w.records) {
    rig.focus(id, w.focusBounds(id));
    rig.update(3);
    w.update(1.2, id, 35);
    w.scene.updateMatrixWorld(true);
    const visible = [];
    w.scene.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      visible.push(o);
    });
    for (const npc of w.npcs.filter((n) => {
      for (let p = n; p; p = p.parent) if (p === record.root) return true;
      return false;
    })) {
      const point = npc.localToWorld(new Vector3(0, 0.85, 0.24)).project(rig.camera),
        ray = new Raycaster();
      ray.setFromCamera(new Vector2(point.x, point.y), rig.camera);
      const action = ray.intersectObjects(visible, false)[0]?.object.userData.action;
      assert.equal(action?.type, 'npc', `${id} ${npc.name} must not be hidden behind scenery`);
      assert.equal(action.unitId, id);
      assert.equal(action.id, npc.name.slice(4));
    }
  }
  w.dispose();
});
