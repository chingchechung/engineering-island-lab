import {
  Box3,
  Group,
  Vector3,
  InstancedMesh,
  CircleGeometry,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { createPhaseOneScene } from './world/phase-one.js';
import { PRESETS, isUnitOpen } from './world/presets.js';
import { createThemeIsland } from './world/themes.js';
import { createNpc } from './world/props.js';
import { createBridge, createGate, findShore } from './world/bridge.js';
import { batchStatic, disposeScene } from './world/optimize.js';
import { addIslandDressing } from './world/dressing.js';
import { createIslandFauna } from './world/fauna.js';
import { createNpcMotion } from './world/npc-motion.js';
import { createNpcSafety } from './world/npc-safety.js';
import { createRadialLayout } from './world/layout.js';
import { createSeaLife } from './world/sea-life.js';
import { createVisitors } from './world/visitors.js';
import { validateCourseConfig, validateManifest } from './config.js';
import { questionAppearances } from './world/npc-presets.js';

export function createIslandScene(input, fixture = null, options = {}) {
  const config = validateCourseConfig(input);
  const manifest = validateManifest(
    options.manifest ?? {
      schemaVersion: 1,
      units: fixture ? [{ unitId: 'S01', title: 'Demo', file: 'S01.json' }] : [],
    },
    config.totalUnits,
  );
  const layout = createRadialLayout(config.totalUnits);
  const motions = new Map();
  const open = (id) => isUnitOpen(manifest, id);
  // Runtime passes only validated assignments. The old fixture argument remains
  // available for the original geometry tests, never as a fallback for load errors.
  const questionsFor = (id) =>
    options.assignments
      ? options.assignments.has(id)
        ? questionAppearances(options.assignments.get(id))
        : []
      : (fixture?.questions ?? []);
  const firstQuestions = questionsFor('S01');
  const base = createPhaseOneScene(
    config,
    open('S01') && firstQuestions.length ? { questions: firstQuestions } : null,
  );
  const { scene, islands, academy, forest, shark } = base;
  const records = new Map();
  const labels = base.labels,
    npcs = base.npcs,
    animals = [],
    bridges = [];
  let pickables = base.pickables;
  const register = (object, action) =>
    object.traverse((child) => {
      if (child.isMesh) child.userData.action = action;
    });
  const label = (parent, id, text, position, action, kind, unitId) => {
    const anchor = new Group();
    anchor.position.set(...position);
    parent.add(anchor);
    labels.push({ anchor, id, text, action, kind, unitId });
  };
  for (const item of labels) {
    if (item.id === 'S01') item.kind = open('S01') ? 'unit' : 'locked';
    if (item.id !== 'academy') item.unitId = 'S01';
    if (item.action) item.action.unitId = item.id === 'academy' ? 'academy' : 'S01';
  }
  for (const object of pickables) {
    if (object.userData.action)
      object.userData.action.unitId = object.userData.action.id === 'academy' ? 'academy' : 'S01';
  }
  const firstTerrain = forest.getObjectByName('coast-and-cliffs');
  const first = {
    root: forest,
    terrain: firstTerrain,
    house: forest.getObjectByName('lecture-cottage'),
    preset: { ...PRESETS[0], ...layout.get('S01') },
    top: 0.8,
    animate: [],
    animals: [shark],
    unlocked: open('S01'),
  };
  records.set('S01', first);
  const oldForest = forest.position.clone();
  forest.position.set(
    academy.position.x + first.preset.position[0],
    0,
    academy.position.z + first.preset.position[1],
  );
  const forestShift = forest.position.clone().sub(oldForest);
  scene.children
    .filter(
      (o) =>
        o.isMesh &&
        o.geometry?.type === 'RingGeometry' &&
        o.position.distanceTo(new Vector3(oldForest.x, -2.52, oldForest.z)) < 0.1,
    )
    .forEach((o) => o.position.add(forestShift));
  base.bridge.removeFromParent();
  disposeScene(base.bridge);
  shark.userData.animated = true;
  const core = { root: academy, terrain: academy.getObjectByName('coast-and-cliffs') };
  for (const definition of PRESETS.slice(1, config.totalUnits)) {
    const preset = { ...definition, ...layout.get(definition.id) };
    const record = { ...createThemeIsland(preset), preset, unlocked: open(preset.id), animals: [] };
    record.root.position.set(
      academy.position.x + preset.position[0],
      0,
      academy.position.z + preset.position[1],
    );
    islands.add(record.root);
    records.set(preset.id, record);
    register(record.terrain, { type: 'island', id: preset.id, unitId: preset.id });
    register(record.house, {
      type: record.unlocked ? 'lecture' : 'island',
      id: preset.id,
      unitId: preset.id,
    });
    label(
      record.root,
      preset.id,
      `${preset.id} · ${preset.title}`,
      [0, record.top + 4.8, -1.6],
      { type: 'island', id: preset.id, unitId: preset.id },
      record.unlocked ? 'unit' : 'locked',
      preset.id,
    );
    label(
      record.house,
      `${preset.id}-lecture`,
      '▶ Lecture',
      [0, 2.8, 0.4],
      { type: record.unlocked ? 'lecture' : 'island', id: preset.id, unitId: preset.id },
      'lecture',
      preset.id,
    );
    if (record.unlocked && config.assignmentMode === 'quiz') {
      const questions = questionsFor(preset.id);
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i],
          npc = createNpc(q);
        npc.userData.detail = true;
        const [x, z] = q.position;
        npc.position.set(x, record.top + 0.17, z);
        record.root.add(npc);
        npcs.push(npc);
        const action = { type: 'npc', id: q.id, unitId: preset.id };
        register(npc, action);
        label(npc, `${preset.id}-${q.id}`, q.id, [0, 2, 0], action, 'question', preset.id);
        label(npc, `${preset.id}-${q.id}-badge`, q.id, [0, 0.68, 0.28], null, 'badge', preset.id);
      }
    }
  }
  for (const record of records.values()) {
    record.dressing = addIslandDressing(record);
    record.creatures = createIslandFauna(record);
    record.animals = record.creatures.map((m) => m.group);
    animals.push(...record.animals);
  }
  npcs.forEach((npc) => (npc.userData.detail = true));
  for (const npc of npcs) {
    const item = labels.find((l) => l.kind === 'question' && l.anchor.parent === npc);
    if (item) label(npc, `${item.id}-hat`, item.text, [0, 1.57, 0.32], null, 'badge', item.unitId);
  }
  // All planned links remain intact; the incoming gate alone denotes publication.
  scene.updateMatrixWorld(true);
  for (const [id, record] of records) {
    let curve;
    const parent = record.preset.parent === 'academy' ? core : records.get(record.preset.parent);
    const start =
      config.totalUnits === 1 && id === 'S01'
        ? new Vector3(-2.1, 1.02, -0.3)
        : findShore(parent.terrain, record.root.position);
    const end =
      config.totalUnits === 1 && id === 'S01'
        ? new Vector3(2.9, 1.02, 1.25)
        : findShore(record.terrain, parent.root.position);
    const built = createBridge(start, end);
    curve = built.curve;
    bridges.push(built.group);
    scene.add(built.group);
    record.link = { from: record.preset.parent, to: id, curve, bridge: built.group };
    if (!record.unlocked) {
      const gate = createGate(curve);
      scene.add(gate.root);
      record.gate = gate.root;
      const action = { type: 'island', id, unitId: id };
      register(gate.root, action);
      labels.push({
        anchor: gate.anchor,
        id: `${id}-gate`,
        text: '🔒',
        action,
        kind: 'gate',
        unitId: id,
      });
    }
  }
  // Publication controls S01 Lecture access independently of the NPC Demo fixture.
  if (open('S01')) {
    // Publication, rather than the optional NPC fixture, enables real Lecture access.
    const action = { type: 'lecture', id: 'S01', unitId: 'S01' };
    register(first.house, action);
    labels.find((l) => l.id === 'lecture').action = action;
  } else {
    register(first.house, { type: 'island', id: 'S01', unitId: 'S01' });
    const lectureLabel = labels.find((l) => l.id === 'lecture');
    lectureLabel.action = { type: 'island', id: 'S01', unitId: 'S01' };
  }
  for (const [id, record] of records) {
    record.npcs = npcs.filter((npc) => {
      for (let p = npc; p; p = p.parent) if (p === record.root) return true;
      return false;
    });
    record.safety = createNpcSafety(record);
    record.npcs.forEach((npc, i) => {
      const peers = record.npcs.filter((other) => other !== npc);
      const start = record.safety.findStart(npc.position.clone(), peers);
      npc.position.copy(start);
      const motion = createNpcMotion(npc, {
        center: start,
        radius: 1.05,
        seed: Number(id.slice(1)) * 101 + i * 37,
        isSafe: record.safety.isSafe,
        heightAt: record.safety.heightAt,
        peers: () => peers,
      });
      motions.set(`${id}/${npc.name.slice(4)}`, {
        npc,
        motion,
        unitId: id,
        questionId: npc.name.slice(4),
        safety: record.safety,
        center: start.clone(),
        radius: 1.05,
      });
    });
  }
  // One inexpensive contact-shadow instance per island keeps overview depth without global shadow maps.
  const contacts = new InstancedMesh(
    new CircleGeometry(1, 32),
    new MeshBasicMaterial({ color: '#6f9e8d', transparent: true, opacity: 0.1, depthWrite: false }),
    config.totalUnits + 1,
  );
  contacts.name = 'island-contact-shadows';
  const stamp = new Object3D();
  [core, ...records.values()].forEach((record, i) => {
    stamp.position.set(record.root.position.x + 0.25, -2.51, record.root.position.z + 0.25);
    stamp.rotation.set(-Math.PI / 2, 0, 0);
    const radius = record.preset?.radius ?? 5.8;
    stamp.scale.set(radius * 1.03, radius * 0.85, 1);
    stamp.updateMatrix();
    contacts.setMatrixAt(i, stamp.matrix);
  });
  contacts.computeBoundingSphere();
  scene.add(contacts);
  scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(islands);
  const framingPoints = [];
  for (const root of [academy, ...[...records.values()].map((r) => r.root)]) {
    const box = new Box3().setFromObject(root);
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) framingPoints.push(new Vector3(x, y, z));
  }
  labels
    .filter((l) => l.id === 'academy' || records.has(l.id))
    .forEach((l) => {
      const p = l.anchor.getWorldPosition(new Vector3());
      bounds.expandByPoint(p);
      framingPoints.push(p);
    });
  bridges.forEach((bridge) => bounds.expandByObject(bridge));
  // Background life never participates in island framing, curriculum or picking.
  const visitors = createVisitors({ academy, records });
  const seaLife = createSeaLife({ bounds });
  scene.add(visitors.root, seaLife.root);
  const sun = scene.children.find((o) => o.isDirectionalLight);
  const lightOffset = sun.position.clone().sub(academy.position);
  sun.target.position.copy(academy.position);
  scene.add(sun.target);
  let optimized = false,
    lastView = null,
    lastFar = -1;
  const refreshPicks = () => {
    pickables = [];
    scene.traverse((o) => {
      if (o.isMesh && o.userData.action) pickables.push(o);
    });
    return pickables;
  };
  refreshPicks();
  const world = {
    scene,
    islands,
    academy,
    forest,
    shark,
    npcs,
    animals,
    bridges,
    records,
    labels,
    bounds,
    bridge: bridges[0],
    motions,
    framingPoints,
    visitors,
    seaLife,
    setNpcPaused(unitId, questionId, paused) {
      const entry = motions.get(`${unitId}/${questionId}`);
      if (!entry) return false;
      entry.motion.setPaused(paused);
      return true;
    },
    manifest,
    get pickables() {
      return pickables;
    },
    isOpen: open,
    focusBounds(id) {
      if (id === 'academy') return base.focusBounds(id);
      const record = records.get(id);
      if (!record) throw new Error('不存在的島嶼');
      return new Box3()
        .setFromObject(record.root)
        .expandByPoint(labels.find((l) => l.id === id).anchor.getWorldPosition(new Vector3()));
    },
    optimize() {
      if (optimized) return;
      optimized = true;
      for (const root of [
        academy,
        ...[...records.values()].map((r) => r.root),
        ...bridges,
        ...[...records.values()].map((r) => r.gate).filter(Boolean),
      ])
        batchStatic(root);
      batchStatic(scene.getObjectByName('sea-foam'));
      for (const animal of animals) batchStatic(animal);
      // Moving windmill blades are baked within their own moving frame.
      scene.traverse((o) => {
        if (o.isGroup && o.userData.animated && !o.userData.decoration) batchStatic(o);
      });
      refreshPicks();
    },
    update(seconds, view = 'overview', pixelsPerUnit = 30, focusTarget = null) {
      const farTick = Math.floor(seconds * 6),
        near = new Set();
      for (const [id, record] of records) {
        const close = focusTarget
          ? Math.hypot(
              record.root.position.x - focusTarget.x,
              record.root.position.z - focusTarget.z,
            ) < 13
          : true;
        const detail =
          id === view ||
          (view === 'overview' && close && record.preset.radius * 2 * pixelsPerUnit >= 240);
        if (detail) near.add(id);
        if (!optimized || detail || farTick !== lastFar) {
          record.creatures.forEach((motion) => motion.update(seconds));
          for (const npc of record.npcs)
            motions.get(`${id}/${npc.name.slice(4)}`).motion.update(seconds);
          record.animate.forEach((fn) => fn(seconds));
        }
        record.root.traverse((o) => {
          if (o.userData.detail) o.visible = detail;
          if (o.isMesh) {
            o.userData.shadowable ??= o.castShadow;
            o.castShadow = o.userData.shadowable && (detail || id === view);
          }
        });
      }
      if (!optimized || view !== 'overview' || farTick !== lastFar) visitors.update(seconds);
      seaLife.update(seconds);
      lastFar = farTick;
      sun.castShadow = view !== 'overview';
      if (lastView !== view) {
        const target =
          view === 'overview' || view === 'academy'
            ? academy.position
            : records.get(view)?.root.position;
        if (target) {
          sun.target.position.copy(target);
          sun.position.copy(target).add(lightOffset);
          sun.target.updateMatrixWorld();
        }
        for (const record of records.values())
          record.link.bridge.traverse((o) => {
            if (o.isMesh) o.castShadow = view === record.preset.id || view === record.link.from;
          });
        academy.traverse((o) => {
          if (o.isMesh) {
            o.userData.shadowable ??= o.castShadow;
            o.castShadow = o.userData.shadowable && view === 'academy';
          }
        });
        for (const record of records.values())
          if (record.gate)
            record.gate.traverse((o) => {
              if (o.isMesh) o.castShadow = view === record.preset.id;
            });
        lastView = view;
      }
      return near;
    },
    visiblePickables() {
      return pickables.filter((o) => {
        for (let p = o; p; p = p.parent) if (!p.visible) return false;
        return true;
      });
    },
    dispose() {
      disposeScene(scene);
    },
  };
  return world;
}
