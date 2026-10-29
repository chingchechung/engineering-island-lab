import { WebGLRenderer, PCFShadowMap, SRGBColorSpace, ACESFilmicToneMapping, Vector3 } from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { loadCourseConfig, loadManifest, isLocalDemo } from './config.js';
import { createIslandScene } from './scene.js';
import { CameraRig } from './camera.js';
import { attachInteraction } from './interaction.js';
import { attachLabels, createDialog, layoutIslandLabels } from './ui.js';
import { getPreset } from './world/presets.js';
import './style.css';

const $ = (selector) => document.querySelector(selector),
  dialog = createDialog();
const host = $('#canvas-host'),
  labelHost = $('#labels'),
  loading = $('#loading');
let renderer,
  labelRenderer,
  world,
  rig,
  config,
  officialManifest,
  demoModule,
  fixture,
  labels = [],
  mode,
  demo;
let animationFrame,
  lastTime = 0,
  time = 0,
  fps = 0,
  frames = 0,
  fpsStart = 0,
  labelFrame = 0;
const position = new Vector3();
let cardUnit = 'S01';
function setStatus(text) {
  $('#view-status').textContent = text;
}
function showAbout(source) {
  dialog.show(
    '每座島，都有新的風景。',
    [
      `歡迎來到 Engineering Island Lab。本課程「${config.courseTitle}」有 ${config.totalUnits} 座單元島。`,
      'Phase 2 先探索地貌、動物與群島操作。每座島都有自己的主題；橋樑與小動物只作為環境裝飾。',
      demo
        ? '你正在本機 Demo 中，可模擬島嶼數與開放進度；這些設定不會發布課程。'
        : '島嶼是否開放依教師的發布清單。尚未開放的島保留完整外觀，入口會顯示木柵欄。',
      'Lecture 與探索者仍為視覺占位說明，不提供影片、題目、答案或表單。',
      '小動物會自主活動，不接受點擊、餵食或控制。',
    ],
    source,
  );
}
function updateCard(id) {
  cardUnit = id;
  const arrow = document.createElement('span');
  arrow.textContent = '→';
  arrow.setAttribute('aria-hidden', 'true');
  $('#explore').replaceChildren(
    document.createTextNode(id === 'academy' ? '中央學院' : `探索 ${id}`),
    arrow,
  );
  const record = world.records.get(id),
    preset = record?.preset;
  $('.card-number').textContent =
    `${id === 'academy' ? '00' : id.slice(1)} / ${String(config.totalUnits).padStart(2, '0')}`;
  $('.explore-card h2').textContent = id === 'academy' ? '中央學院' : (preset?.title ?? '探索群島');
  $('.explore-card p').textContent =
    id === 'academy'
      ? '知識的旅程，從這裡展開。'
      : record.unlocked
        ? '沿著小徑，發現知識的新風景。'
        : `${id} 尚未開放，可欣賞地貌與動物。`;
  $('#access-tag').textContent =
    id === 'academy'
      ? `${config.totalUnits} 座單元島`
      : record.unlocked
        ? demo
          ? '本機 DEMO · 視覺原型'
          : '教師已開放'
        : '🔒 尚未開放';
  $('#unit-navigation').value = id;
}
function onAction(action, source = renderer.domElement) {
  if (dialog.open) return;
  const unitId = action.unitId ?? (action.type === 'npc' ? 'S01' : action.id);
  if (action.type === 'island') {
    rig.focus(unitId, world.focusBounds(unitId));
    updateCard(unitId);
    setStatus(
      unitId === 'academy'
        ? '中央學院'
        : world.isOpen(unitId)
          ? `${unitId} · ${getPreset(unitId).title}`
          : `${unitId} 尚未開放`,
    );
    return;
  }
  // Recheck publication at the UI boundary, even for a stale action after a rebuild.
  if (!world.isOpen(unitId)) {
    setStatus(`${unitId} 尚未開放`);
    return;
  }
  if (action.type === 'lecture')
    dialog.show(
      `${unitId} · ${getPreset(unitId).title} Lecture`,
      [
        'Lecture · 外觀與點擊預覽',
        '你找到這座島的小教室了。目前先驗收小屋造型、點擊與視窗操作。',
        '正式影片清單將在後續階段加入；這個視窗沒有 YouTube 連結，也不會開啟外部網站。',
      ],
      source,
      `${unitId} · LECTURE PREVIEW`,
    );
  if (action.type === 'npc' && demo && mode === 'quiz') {
    const question = fixture.questions.find((q) => q.id === action.id);
    if (question)
      dialog.show(
        `${question.id} · 探索者${question.name}`,
        [
          `你好，我是${question.name}！這裡是 ${unitId}，我是 ${question.id} 的角色原型。`,
          '這裡只展示角色與點擊效果，沒有真實題目、答案、題目影片或 Google Form。',
          '目前只確認角色、標牌是否清楚，以及視窗是否容易操作。',
        ],
        source,
        `${unitId} · CHARACTER DEMO`,
      );
  }
}
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
              ? `${id} Lecture · 點擊預覽`
              : `${id} · ${getPreset(id).title} · 點擊探索`;
  }
}
function reset() {
  if (dialog.open) return;
  rig.reset();
  setStatus('群島總覽');
  $('#unit-navigation').value = 'overview';
}
function localNumber(key, fallback, allowed) {
  const raw = new URLSearchParams(location.search).get(key);
  const value = raw === null ? fallback : Number(raw);
  return demo && allowed.includes(value) ? value : fallback;
}
function rebuild(modeValue, resetCamera = false) {
  mode = modeValue;
  labelFrame = 0;
  const old = world;
  for (const item of labels) item.element.remove();
  if (old) old.dispose();
  if (demo) {
    const count = Number($('#demo-questions').value);
    const questions = [...demoModule.demoFixture.questions];
    if (count === 5)
      questions.push({ id: 'Q05', name: '小嶼', color: '#739bb8', position: [3.6, 0.1] });
    fixture = { ...demoModule.demoFixture, questions };
  }
  const manifest = demo
    ? demoModule.createDemoManifest(config.totalUnits, Number($('#demo-open').value))
    : officialManifest;
  world = createIslandScene({ ...config, assignmentMode: mode }, demo ? fixture : null, {
    manifest,
  });
  world.optimize();
  labels = attachLabels(world.labels, onAction);
  labelHost.replaceChildren(labelRenderer.domElement);
  if (!rig || resetCamera) rig = new CameraRig(world.bounds, host.clientWidth / host.clientHeight);
  $('#mode-quiz').setAttribute('aria-pressed', String(mode === 'quiz'));
  $('#mode-video').setAttribute('aria-pressed', String(mode === 'video-only'));
  document.body.classList.toggle('full-world', config.totalUnits > 1);
  $('#course-summary').textContent =
    `${config.totalUnits} 座主題島 · ${manifest.units.length} 座${demo ? '模擬開放' : '教師已開放'}`;
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
  updateCard(world.records.has(rig.view) ? rig.view : 'S01');
  if (rig.view === 'overview') nav.value = 'overview';
  updateHover(null);
  if (resetCamera) reset();
  else if (rig.view !== 'overview' && rig.view !== 'academy')
    setStatus(
      world.isOpen(rig.view)
        ? `${rig.view} · ${getPreset(rig.view).title}`
        : `${rig.view} 尚未開放`,
    );
}
async function start() {
  config = await loadCourseConfig(document.baseURI);
  officialManifest = await loadManifest(document.baseURI, config.totalUnits);
  demo = isLocalDemo(location.search, import.meta.env.DEV);
  if (demo) {
    demoModule = await import('./demo/fixture.js');
    config.totalUnits = localNumber('units', config.totalUnits, [1, 12, 15]);
    $('#demo-units').value = String(config.totalUnits);
    $('#demo-open').value = String(localNumber('open', 4, [0, 1, 4, 15]));
    // A one-unit regression preview maps open=1 to the same all-open visual choice.
    if (!$('#demo-open').value) $('#demo-open').value = '15';
  }
  $('#course-title').textContent = config.courseTitle;
  document.title = `Engineering Island Lab · ${config.courseTitle}`;
  $('#demo-controls').hidden = !demo;
  $('#demo-entry').hidden = demo || !import.meta.env.DEV;
  renderer = new WebGLRenderer({ antialias: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '課程群島，可拖曳平移及滾輪縮放');
  host.append(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelHost.append(labelRenderer.domElement);
  rebuild(config.assignmentMode);
  attachInteraction({
    canvas: renderer.domElement,
    get rig() {
      return rig;
    },
    getPickables: () => world.visiblePickables(),
    blocked: () => dialog.open,
    onAction,
    onHover: updateHover,
  });
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    rig.resize(w / h);
  };
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    loading.hidden = false;
    loading.textContent = '3D 畫面已中斷，請重新整理頁面。';
  });
  $('#overview').addEventListener('click', reset);
  $('#explore').addEventListener('click', () =>
    onAction({ type: 'island', id: cardUnit, unitId: cardUnit }),
  );
  $('#zoom-in').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(-140);
  });
  $('#zoom-out').addEventListener('click', () => {
    if (!dialog.open) rig.zoom(140);
  });
  $('#mode-quiz').addEventListener('click', () => {
    if (!dialog.open && mode !== 'quiz') rebuild('quiz');
  });
  $('#mode-video').addEventListener('click', () => {
    if (!dialog.open && mode !== 'video-only') rebuild('video-only');
  });
  $('#demo-units').addEventListener('change', () => {
    config.totalUnits = Number($('#demo-units').value);
    rebuild(mode, true);
    resize();
  });
  for (const selector of ['#demo-open', '#demo-questions'])
    $(selector).addEventListener('change', () => rebuild(mode));
  $('#unit-navigation').addEventListener('change', (event) => {
    if (event.target.value === 'overview') reset();
    else onAction({ type: 'island', id: event.target.value, unitId: event.target.value });
  });
  $('#about').addEventListener('click', (event) => showAbout(event.currentTarget));
  renderer.domElement.addEventListener('keydown', (event) => {
    if (dialog.open) return;
    if (['Home', 'Escape'].includes(event.key)) {
      event.preventDefault();
      reset();
    }
    if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      rig.zoom(event.key === '-' ? 100 : -100);
    }
  });
  function draw(timestamp) {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.05) : 0;
    lastTime = timestamp;
    time += dt;
    frames++;
    if (timestamp - fpsStart >= 1000) {
      fps = (frames * 1000) / (timestamp - fpsStart);
      fpsStart = timestamp;
      frames = 0;
    }
    rig.update(dt);
    const pixels = (host.clientHeight * rig.camera.zoom) / rig.height;
    const near = world.update(time, rig.view, pixels, rig.target);
    for (const item of labels) {
      const detail = near.has(item.unitId);
      if (['question', 'badge', 'lecture', 'gate'].includes(item.kind))
        item.object.visible = detail;
      item.element.classList.toggle('in-detail', detail);
    }
    renderer.render(world.scene, rig.camera);
    labelRenderer.render(world.scene, rig.camera);
    if (
      config.totalUnits > 1 &&
      rig.view === 'overview' &&
      (++labelFrame % 4 === 0 || labelFrame < 4)
    )
      layoutIslandLabels(labels, host.getBoundingClientRect());
    if (rig.view !== 'overview') for (const item of labels) item.element.style.translate = '';
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
  if (import.meta.env.DEV)
    window.__islandLab = {
      snapshot: () => ({
        mode,
        demo,
        view: rig.view,
        zoom: rig.camera.zoom,
        target: rig.target.toArray(),
        totalUnits: config.totalUnits,
        npcCount: world.npcs.length,
        shark: world.shark.position.toArray(),
        dialog: dialog.open,
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
        animals: world.animals.map((a) => ({ name: a.name, position: a.position.toArray() })),
        landmarks: [...world.records].map(([id, r]) => {
          const p = r.root.getWorldPosition(position).project(rig.camera);
          return { id, x: p.x, y: p.y, z: p.z };
        }),
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
