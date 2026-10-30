import { WebGLRenderer, PCFShadowMap, SRGBColorSpace, ACESFilmicToneMapping, Vector3 } from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { loadCourseConfig, loadManifest, resolvePreviewOptions } from './config.js';
import { createIslandScene } from './scene.js';
import { CameraRig } from './camera.js';
import { attachInteraction } from './interaction.js';
import { attachLabels, createDialog, layoutIslandLabels } from './ui.js';
import { getPreset } from './world/presets.js';
import { createDayNight } from './world/day-night.js';
import { createLectureLoader } from './lecture-data.js';
import { createLectureController } from './lecture-ui.js';
import './style.css';
import './lecture.css';

const $ = (selector) => document.querySelector(selector),
  dialog = createDialog();
const host = $('#canvas-host'),
  labelHost = $('#labels'),
  loading = $('#loading');
let renderer,
  labelRenderer,
  world,
  lighting,
  rig,
  config,
  fixture,
  labels = [],
  mode,
  demo,
  interaction,
  activeNpc = null;
let lectureController;
let animationFrame,
  lastTime = 0,
  time = 0,
  fps = 0,
  frames = 0,
  fpsStart = 0,
  labelFrame = 0;
function setStatus(text) {
  $('#view-status').textContent = text;
}
function focusUnit(id) {
  if (dialog.open) return;
  if (id === 'overview') {
    rig.reset();
    setStatus('群島總覽');
  } else {
    rig.focus(id, world.focusBounds(id));
    setStatus(
      id === 'academy'
        ? '中央學院'
        : world.isOpen(id)
          ? `${id} · ${getPreset(id).title}`
          : `${id} 尚未開放`,
    );
  }
  $('#unit-navigation').value = id;
}
function showAbout(source) {
  if (dialog.open) return;
  resumeNpc();
  dialog.show(
    '群島操作說明',
    [
      `本課程「${config.courseTitle}」包含 ${config.totalUnits} 座單元島。用左下導覽或點島嶼標牌前往各島。`,
      '左鍵單擊探索；左鍵拖曳旋轉，右鍵或 Shift＋左鍵拖曳平移，滾輪縮放。觸控單指仍可平移。按「返回總覽」恢復標準方向與完整群島。',
      '右上太陽／月亮按鈕切換白天與夜晚，約 1.25 秒平滑點燈；重新整理回到白天。內容視窗開啟時，相機暫停操作。',
      demo
        ? '目前是本機視覺 Demo，開放狀態與角色數只供測試，不會發布正式課程。'
        : '島嶼是否開放依教師發布清單；未開放島仍可欣賞地貌與動物。',
      '探索者會緩慢漫遊，點擊後停下；關閉說明視窗後繼續走動。已開放小屋提供影片清單，影片依教師順序另開 YouTube；題目目前仍為 Demo 說明。',
      '三隻小動物會自主活動，不接受點擊、餵食或控制。',
      '外海鯨魚和島上小旅人都是背景角色；小旅人只在已開放島與橋上巡遊，沒有題目標籤，也不能互動。',
    ],
    source,
  );
}
function onAction(action, source = renderer.domElement) {
  if (dialog.open) return;
  resumeNpc();
  const unitId = action.unitId ?? (action.type === 'npc' ? 'S01' : action.id);
  if (unitId !== 'academy' && !world.records.has(unitId)) return;
  if (action.type === 'island') {
    focusUnit(unitId);
    return;
  }
  if (!world.isOpen(unitId)) {
    setStatus(`${unitId} 尚未開放`);
    return;
  }
  if (action.type === 'lecture') {
    if (rig.view !== unitId) focusUnit(unitId);
    void lectureController.open(unitId, source);
  }
  if (action.type === 'npc' && demo && mode === 'quiz') {
    const question = fixture.questions.find((q) => q.id === action.id);
    if (!question) return;
    world.setNpcPaused(unitId, action.id, true);
    activeNpc = { unitId, questionId: action.id };
    if (rig.view !== unitId) focusUnit(unitId);
    dialog.show(
      `${question.id} · 探索者${question.name}`,
      [
        `你好，我是${question.name}！這裡是 ${unitId}，我是 ${question.id} 的角色原型。`,
        '我先停下來和你說話。關閉這個視窗後，我會繼續在島上慢慢散步。',
        '目前沒有真實題目、答案、題目影片或 Google Form。',
      ],
      source,
      `${unitId} · NPC Demo`,
    );
  }
}
function resumeNpc() {
  if (activeNpc) {
    world.setNpcPaused(activeNpc.unitId, activeNpc.questionId, false);
    activeNpc = null;
  }
}
$('#detail-dialog').addEventListener('close', () => {
  if (!dialog.open) resumeNpc();
});
function updateHover(action) {
  if (!renderer || !world) return;
  renderer.domElement.classList.toggle('has-target', Boolean(action));
  for (const item of labels)
    item.element.classList.toggle(
      'is-hovered',
      Boolean(
        action &&
          item.action?.id === action.id &&
          item.action.type === action.type &&
          item.action.unitId === action.unitId,
      ),
    );
  const tooltip = $('#tooltip');
  tooltip.hidden = !action;
  if (action) {
    const id = action.unitId ?? action.id;
    tooltip.textContent =
      action.type === 'npc'
        ? `${id} · ${action.id} 探索者`
        : id === 'academy'
          ? '中央學院 · 點擊聚焦'
          : !world.isOpen(id)
            ? `${id} 尚未開放`
            : action.type === 'lecture'
              ? `${id} Lecture · 開啟影片清單`
              : `${id} · ${getPreset(id).title}`;
  }
}
async function start() {
  const officialCourse = await loadCourseConfig(document.baseURI);
  const officialManifest = await loadManifest(document.baseURI, officialCourse.totalUnits);
  const preview = resolvePreviewOptions(location.search, import.meta.env.DEV, officialCourse);
  config = preview.course;
  demo = preview.demo;
  mode = config.assignmentMode;
  let manifest = officialManifest;
  let readDemo = null;
  if (import.meta.env.DEV && demo) {
    const module = await import('./demo/fixture.js');
    const questions = [...module.demoFixture.questions];
    if (preview.questionCount === 5)
      questions.push({ id: 'Q05', name: '小嶼', color: '#739bb8', position: [3.6, 0.1] });
    fixture = { ...module.demoFixture, questions };
    manifest = module.createDemoManifest(config.totalUnits, preview.openCount);
    readDemo = (await import('./demo/lecture-fixture.js')).readDemoLecture;
  }
  lectureController = createLectureController({
    dialog,
    loader: createLectureLoader({
      baseUrl: document.baseURI,
      totalUnits: config.totalUnits,
      manifest,
      readDemo,
    }),
    demo,
  });
  $('#course-title').textContent = config.courseTitle;
  $('#course-title').title = config.courseTitle;
  document.title = `Engineering Island Lab · ${config.courseTitle}`;
  $('#course-summary').textContent =
    `${config.totalUnits} 島 · ${demo ? 'Demo ' : '開放 '}${manifest.units.length}`;
  renderer = new WebGLRenderer({ antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    '課程群島，左拖旋轉、右拖或 Shift 左拖平移、滾輪縮放',
  );
  host.append(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelHost.append(labelRenderer.domElement);
  world = createIslandScene(config, demo ? fixture : null, { manifest });
  world.optimize();
  lighting = createDayNight(world);
  labels = attachLabels(world.labels, onAction);
  rig = new CameraRig(world.bounds, host.clientWidth / host.clientHeight, world.framingPoints);
  const nav = $('#unit-navigation');
  nav.replaceChildren();
  for (const [value, text] of [
    ['overview', '群島總覽'],
    ['academy', '中央學院'],
    ...[...world.records].map(([id, r]) => [
      id,
      `${r.unlocked ? '' : '🔒 '}${id} ${r.preset.title}`,
    ]),
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    nav.append(option);
  }
  interaction = attachInteraction({
    canvas: renderer.domElement,
    rig,
    getPickables: () => world.visiblePickables(),
    blocked: () => dialog.open,
    onAction,
    onHover: updateHover,
  });
  // The second finger may land on a CSS label rather than the canvas. Cancel
  // both gesture owners before either surface receives that non-primary touch.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch' && event.isPrimary === false) {
        interaction.cancel();
        labels.forEach((item) => item.cancelGesture());
      }
    },
    { capture: true },
  );
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    rig.resize(w / h);
    labelFrame = 0;
  };
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    loading.hidden = false;
    loading.textContent = '3D 畫面已中斷，請重新整理頁面。';
  });
  nav.addEventListener('change', (event) => focusUnit(event.target.value));
  $('#overview').addEventListener('click', () => focusUnit('overview'));
  $('#zoom-in').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(-140);
  });
  $('#zoom-out').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(140);
  });
  $('#about').addEventListener('click', (event) => showAbout(event.currentTarget));
  $('#day-night').addEventListener('click', () => {
    if (dialog.open) return;
    const night = $('#day-night').getAttribute('aria-pressed') !== 'true';
    lighting.setMode(night ? 'night' : 'day');
    document.documentElement.dataset.time = night ? 'night' : 'day';
    const button = $('#day-night');
    button.setAttribute('aria-pressed', String(night));
    button.setAttribute('aria-label', night ? '切換至白天模式' : '切換至夜晚模式');
    button.title = button.getAttribute('aria-label');
    button.firstElementChild.textContent = night ? '☾' : '☀';
  });
  renderer.domElement.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    if (['Home', 'Escape'].includes(event.key)) {
      event.preventDefault();
      focusUnit('overview');
    }
    if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      rig.zoom(event.key === '-' ? 100 : -100);
    }
  });
  function draw(timestamp) {
    const elapsed = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.25) : 0;
    lastTime = timestamp;
    time += elapsed;
    frames++;
    if (timestamp - fpsStart >= 1000) {
      fps = (frames * 1000) / (timestamp - fpsStart);
      fpsStart = timestamp;
      frames = 0;
    }
    if (!dialog.open) rig.update(elapsed);
    lighting.update(elapsed, { view: rig.view });
    const pixels = (host.clientHeight * rig.camera.zoom) / rig.height,
      near = world.update(time, rig.view, pixels, rig.target);
    for (const item of labels) {
      const detail = near.has(item.unitId);
      if (['question', 'badge', 'lecture', 'gate'].includes(item.kind))
        item.object.visible = detail;
      item.element.classList.toggle('in-detail', detail);
    }
    renderer.render(world.scene, rig.camera);
    labelRenderer.render(world.scene, rig.camera);
    if (++labelFrame % 4 === 0 || labelFrame < 4 || rig.view !== 'overview')
      layoutIslandLabels(labels, host.getBoundingClientRect(), rig.view);
    $('#zoom-level').textContent = `${Math.round(rig.camera.zoom * 100)}%`;
    animationFrame = requestAnimationFrame(draw);
  }
  loading.hidden = true;
  animationFrame = requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animationFrame);
    else {
      lastTime = 0;
      animationFrame = requestAnimationFrame(draw);
    }
  });
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) {
      cancelAnimationFrame(animationFrame);
      lighting.dispose();
      world.dispose();
      renderer.dispose();
    }
  });
  if (import.meta.env.DEV)
    window.__islandLab = {
      inspectPick: (x, y) => {
        const action = Number.isFinite(x) && Number.isFinite(y) ? interaction.pick(x, y) : null;
        return action ? { ...action } : null;
      },
      snapshot: () => {
        const rect = renderer.domElement.getBoundingClientRect();
        const project = (point) => {
          const p = point.project(rig.camera);
          return {
            x: rect.x + ((p.x + 1) * rect.width) / 2,
            y: rect.y + ((1 - p.y) * rect.height) / 2,
            z: p.z,
          };
        };
        const sea = world.seaLife.snapshot();
        return {
          mode,
          demo,
          view: rig.view,
          zoom: rig.camera.zoom,
          goalZoom: rig.zoomGoal,
          target: rig.target.toArray(),
          goalTarget: rig.goal.toArray(),
          azimuth: rig.azimuth,
          elevation: rig.elevation,
          azimuthGoal: rig.azimuthGoal,
          elevationGoal: rig.elevationGoal,
          lighting: lighting.snapshot(),
          lecture: lectureController.snapshot(),
          framingExtent: world.framingPoints.reduce((max, point) => {
            const p = point.clone().project(rig.camera);
            return Math.max(max, Math.abs(p.x), Math.abs(p.y));
          }, 0),
          lectureScreens: [...world.records].map(([id, r]) => ({
            id,
            screen: project(r.house.localToWorld(new Vector3(0.5, 0.9, 0.85))),
          })),
          totalUnits: config.totalUnits,
          npcCount: world.npcs.length,
          shark: world.shark.position.toArray(),
          dialog: dialog.open,
          time,
          sea: {
            ...sea,
            whales: sea.whales.map((whale) => ({
              ...whale,
              screen: project(new Vector3(...whale.position).add(new Vector3(0, 0.6, 0))),
            })),
          },
          visitors: world.visitors.snapshot().map((visitor) => ({
            ...visitor,
            screen: project(new Vector3(...visitor.position).add(new Vector3(0, 0.6, 0))),
          })),
          visitorRoutes: world.visitors.navigation.edges.map(({ from, to, enabled, reason }) => ({
            from,
            to,
            enabled,
            reason,
          })),
          pickableBackground: world.pickables.filter((object) => {
            for (let p = object; p; p = p.parent)
              if (p === world.seaLife.root || p === world.visitors.root) return true;
            return false;
          }).length,
          gates: [...world.records].filter(([, r]) => r.gate).map(([id]) => id),
          open: [...world.records].filter(([, r]) => r.unlocked).map(([id]) => id),
          pickableAnimals: world.pickables.filter((o) => {
            for (let p = o; p; p = p.parent) if (p.userData.decoration) return true;
            return false;
          }).length,
          fps,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          animals: [...world.records].flatMap(([unitId, record]) =>
            record.creatures.map((m) => ({
              unitId,
              kind: m.kind,
              name: m.group.name,
              position: m.group.position.toArray(),
            })),
          ),
          dressing: [...world.records].map(([id, r]) => ({ id, count: r.dressing.count })),
          npcs: [...world.motions.values()].map((entry) => ({
            unitId: entry.unitId,
            id: entry.questionId,
            position: entry.npc.position.toArray(),
            ...entry.motion.getState(),
            screen: project(entry.npc.localToWorld(new Vector3(0, 0.85, 0.24))),
            bodyScreen: project(entry.npc.localToWorld(new Vector3(0, 0.65, 0))),
            headScreen: project(entry.npc.localToWorld(new Vector3(0, 2, 0))),
          })),
          landmarks: [...world.records].map(([id, r]) => {
            const p = r.root.getWorldPosition(new Vector3()).project(rig.camera);
            return { id, x: p.x, y: p.y, z: p.z };
          }),
        };
      },
    };
}
start().catch((error) => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  loading.hidden = false;
  loading.classList.add('load-error');
  loading.textContent = `${error.message}。請確認支援 WebGL 2，並重新整理頁面。`;
  console.error(error);
});
