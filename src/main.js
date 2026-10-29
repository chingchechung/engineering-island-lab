import { WebGLRenderer, PCFShadowMap, SRGBColorSpace, ACESFilmicToneMapping } from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { loadCourseConfig, loadManifest, isLocalDemo } from './config.js';
import { createIslandScene } from './scene.js';
import { CameraRig } from './camera.js';
import { attachInteraction } from './interaction.js';
import { attachLabels, createDialog } from './ui.js';
import { isSharedMaterial } from './world/primitives.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const dialog = createDialog();
let renderer,
  labelRenderer,
  world,
  rig,
  config,
  fixture,
  labels = [],
  mode,
  demo;
let hovered = null,
  animationFrame,
  lastTime = 0,
  time = 0;
const host = $('#canvas-host'),
  labelHost = $('#labels'),
  loading = $('#loading');

function showAbout(source) {
  dialog.show(
    '一座小島，一段探索。',
    [
      '歡迎來到 Engineering Island Lab。這是一座用來探索工程知識的微型群島，目前正在進行 Phase 1 的視覺與操作驗收。',
      `本課程規劃 ${config.totalUnits} 個單元，目前只建造中央學院與 S01 森林島，其餘島嶼將在後續階段完成。`,
      demo
        ? '你正在本機 Demo 中。Lecture 小屋與探索者只提供造型和點擊預覽，不含真實影片、題目、答案或表單。'
        : '正式教材尚未開放。目前可以欣賞島嶼與操作鏡頭，Lecture 和題目互動尚未啟用。',
      '草地上的鯊魚是這裡的自由居民，會自己跳動；牠不提供任何互動。',
      '本階段仍待教師確認美術與操作，不代表正式課程網站已完成。',
    ],
    source,
  );
}
function setStatus(text) {
  $('#view-status').textContent = text;
}
function onAction(action, source = renderer.domElement) {
  if (dialog.open) return;
  hovered = null;
  updateHover(null);
  if (action.type === 'island') {
    rig.focus(action.id, world.focusBounds(action.id));
    setStatus(
      action.id === 'academy' ? '中央學院' : demo ? 'S01 · 森林入門島 · Demo' : 'S01 · 尚未開放',
    );
    return;
  }
  if (!demo) return;
  if (action.type === 'lecture')
    dialog.show(
      fixture.lectureTitle,
      [
        'Lecture · 外觀與點擊預覽',
        '你找到森林裡的小教室了。這扇門未來會開啟本週的 Lecture 影片清單。',
        '目前只驗收小屋造型、點擊與視窗操作，尚未載入任何課程影片。',
        '本 Demo 沒有 YouTube 連結，也不會開啟外部網站。',
      ],
      source,
      'S01 · LECTURE DEMO',
    );
  if (action.type === 'npc' && mode === 'quiz') {
    const npc = fixture.questions.find((q) => q.id === action.id);
    if (npc)
      dialog.show(
        `${npc.id} · 探索者${npc.name}`,
        [
          `你好，我是${npc.name}！我是 ${npc.id} 的 NPC 造型原型。`,
          '這裡只展示點擊與視窗效果，沒有真實題目、答案、題目影片或 Google Form。',
          '未來每一題會有一位探索者；本次先確認角色大小、頭頂標示與點擊是否清楚。',
        ],
        source,
        'S01 · CHARACTER DEMO',
      );
  }
}
function updateHover(action) {
  hovered = action;
  if (!renderer || !world) return;
  renderer.domElement.classList.toggle('has-target', Boolean(action));
  for (const item of labels)
    item.element.classList.toggle(
      'is-hovered',
      Boolean(action && item.action?.id === action.id && item.action.type === action.type),
    );
  const tooltip = $('#tooltip');
  tooltip.hidden = !action;
  if (action)
    tooltip.textContent =
      action.type === 'npc'
        ? `${action.id} · 點擊認識探索者`
        : action.type === 'lecture'
          ? 'Lecture · 點擊預覽小屋'
          : action.id === 'academy'
            ? '中央學院 · 點擊聚焦'
            : demo
              ? '森林入門島 · 點擊探索'
              : '森林入門島 · 尚未開放';
}
function reset() {
  if (dialog.open) return;
  rig.reset();
  setStatus('群島總覽');
}
function rebuild(modeValue) {
  mode = modeValue;
  const old = world;
  if (old) {
    for (const item of labels) item.element.remove();
    const geometries = new Set();
    old.scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
    });
    geometries.forEach((g) => g.dispose());
    // Shared prop materials are reused; unique scene/terrain materials are released.
    const materials = new Set();
    old.scene.traverse((o) => {
      if (o.material && !isSharedMaterial(o.material)) materials.add(o.material);
    });
    materials.forEach((m) => m.dispose());
  }
  world = createIslandScene({ ...config, assignmentMode: mode }, demo ? fixture : null);
  labels = attachLabels(world.labels, onAction);
  labelHost.replaceChildren(labelRenderer.domElement);
  if (!rig) rig = new CameraRig(world.bounds, host.clientWidth / host.clientHeight);
  $('#mode-quiz').setAttribute('aria-pressed', String(mode === 'quiz'));
  $('#mode-video').setAttribute('aria-pressed', String(mode === 'video-only'));
  updateHover(null);
}
async function start() {
  config = await loadCourseConfig(document.baseURI);
  const manifest = await loadManifest(document.baseURI, config.totalUnits);
  demo = isLocalDemo(location.search, import.meta.env.DEV);
  if (demo) fixture = (await import('./demo/fixture.js')).demoFixture;
  $('#course-title').textContent = config.courseTitle;
  document.title = `Engineering Island Lab · ${config.courseTitle}`;
  $('#course-summary').textContent = `${config.totalUnits} 個單元的學習旅程 · 目前呈現 S01 原型`;
  $('.card-number').textContent = `01 / ${String(config.totalUnits).padStart(2, '0')}`;
  $('#access-tag').textContent = demo
    ? '本機 DEMO · 無正式教材'
    : `正式已開放 ${manifest.units.length} 單元`;
  $('#demo-controls').hidden = !demo;
  $('#demo-entry').hidden = demo || !import.meta.env.DEV;
  renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-label', '課程群島，可拖曳平移及滾輪縮放');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelHost.append(labelRenderer.domElement);
  rebuild(config.assignmentMode);
  attachInteraction({
    canvas: renderer.domElement,
    rig,
    getPickables: () => world.pickables,
    blocked: () => dialog.open,
    onAction,
    onHover: updateHover,
  });
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    rig.resize(width / height);
  };
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    loading.hidden = false;
    loading.textContent = '3D 畫面已中斷，請重新整理頁面。';
  });
  $('#overview').addEventListener('click', reset);
  $('#explore').addEventListener('click', () => onAction({ type: 'island', id: 'S01' }));
  $('#zoom-in').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(-140);
  });
  $('#zoom-out').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(140);
  });
  $('#mode-quiz').addEventListener('click', () => {
    if (!dialog.open && mode !== 'quiz') {
      rebuild('quiz');
      setStatus('Quiz Demo · 四位探索者');
    }
  });
  $('#mode-video').addEventListener('click', () => {
    if (!dialog.open && mode !== 'video-only') {
      rebuild('video-only');
      setStatus('Video only Demo · Lecture 小屋');
    }
  });
  $('#about').addEventListener('click', (event) => showAbout(event.currentTarget));
  renderer.domElement.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    if (event.key === 'Home' || event.key === 'Escape') {
      event.preventDefault();
      reset();
    }
    if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      rig.zoom(event.key === '-' ? 100 : -100);
    }
  });
  const draw = (timestamp) => {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
    lastTime = timestamp;
    time += dt;
    rig.update(dt);
    world.update(time);
    for (const item of labels) {
      const detail = rig.camera.zoom >= 1.25;
      if (['question', 'badge'].includes(item.kind)) item.object.visible = detail;
      item.element.classList.toggle('in-detail', detail);
    }
    renderer.render(world.scene, rig.camera);
    labelRenderer.render(world.scene, rig.camera);
    $('#zoom-level').textContent = `${Math.round(rig.camera.zoom * 100)}%`;
    animationFrame = requestAnimationFrame(draw);
  };
  loading.hidden = true;
  animationFrame = requestAnimationFrame(draw);
  // Pause background rendering while preserving the autonomous animation timeline.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animationFrame);
    else {
      lastTime = 0;
      animationFrame = requestAnimationFrame(draw);
    }
  });
  // Local-only read-only probes support real browser acceptance checks.
  if (import.meta.env.DEV)
    window.__islandLab = {
      snapshot: () => ({
        mode,
        demo,
        view: rig.view,
        zoom: rig.camera.zoom,
        target: rig.target.toArray(),
        npcCount: world.npcs.length,
        shark: world.shark.position.toArray(),
        dialog: dialog.open,
        pickableAnimals: world.pickables.filter((o) => {
          for (let p = o; p; p = p.parent) if (p.userData.decoration) return true;
          return false;
        }).length,
      }),
    };
}
start().catch((error) => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  loading.hidden = false;
  loading.classList.add('load-error');
  loading.textContent = `${error.message}。請確認支援 WebGL 2，並重新整理頁面。`;
  console.error(error);
});
