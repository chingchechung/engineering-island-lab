function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function content(unitId, status) {
  const root = element('div', 'lecture-content');
  root.dataset.unit = unitId;
  root.dataset.state = status;
  return root;
}

function loadingContent(unitId) {
  const root = content(unitId, 'loading');
  const message = element('p', 'lecture-status', `正在載入 ${unitId} 課程影片…`);
  message.setAttribute('role', 'status');
  root.append(message);
  return root;
}

function errorContent(unitId, error) {
  const root = content(unitId, 'error');
  root.setAttribute('role', 'alert');
  const detail =
    typeof error?.message === 'string' && error.message.trim()
      ? error.message
      : '資料格式或連線發生問題，請稍後再試。';
  root.append(
    element('p', 'lecture-status', `${unitId} 課程影片載入失敗。`),
    element('p', 'lecture-error-detail', detail),
  );
  return root;
}

function readyContent(data, demo) {
  const root = content(data.unitId, data.videos.length ? 'ready' : 'empty');
  root.append(element('p', 'lecture-description', data.title));
  if (demo)
    root.append(
      element('p', 'lecture-demo-note', '本機示範資料：以下為測試連結，並非正式課程教材。'),
    );
  if (!data.videos.length) {
    const message = element('p', 'lecture-status', '本單元尚無課程影片');
    message.setAttribute('role', 'status');
    root.append(message);
    return root;
  }
  root.append(
    element('p', 'lecture-summary', `共 ${data.videos.length} 部影片，點選後另開 YouTube 分頁。`),
  );
  const list = element('ol', 'lecture-video-list');
  // Loader validation is the trust boundary. Preserve its exact titles, URLs
  // and array order; use native links without a click handler or watch state.
  data.videos.forEach((video, index) => {
    const row = element('li', 'lecture-video-row');
    const link = element('a', 'lecture-video-link');
    link.setAttribute('href', video.url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('aria-label', `${video.title} — 在 YouTube 觀看（另開新分頁）`);
    const number = element('span', 'lecture-video-number', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const copy = element('span', 'lecture-video-copy');
    copy.append(
      element('span', 'lecture-video-title', video.title),
      element('span', 'lecture-video-action', '在 YouTube 觀看 ↗'),
    );
    const play = element('span', 'lecture-play-icon', '▶');
    play.setAttribute('aria-hidden', 'true');
    link.append(number, copy, play);
    row.append(link);
    list.append(row);
  });
  root.append(list);
  return root;
}

/** Share the existing native dialog; do not own camera, NPC or external-tab state. */
export function createLectureController({ dialog, loader, demo = false }) {
  let active = null;
  const isCurrent = (entry) =>
    active === entry && dialog.open && dialog.revision === entry.revision;

  async function open(unitId, source) {
    const entry = {
      unitId,
      status: 'loading',
      videoCount: 0,
      revision: dialog.showContent(
        `${unitId} — Lecture Videos`,
        loadingContent(unitId),
        source,
        `${unitId} · Lecture`,
        { kind: 'lecture' },
      ),
    };
    active = entry;
    try {
      const data = await loader.load(unitId);
      if (!isCurrent(entry)) return;
      const view = readyContent(data, demo);
      if (dialog.replaceContent(view, entry.revision)) {
        entry.status = data.videos.length ? 'ready' : 'empty';
        entry.videoCount = data.videos.length;
      }
    } catch (error) {
      if (!isCurrent(entry)) return;
      if (dialog.replaceContent(errorContent(unitId, error), entry.revision))
        entry.status = 'error';
    }
  }

  function snapshot() {
    if (!active) return { status: 'idle', unitId: null, videoCount: 0 };
    return {
      status: isCurrent(active) ? active.status : 'closed',
      unitId: active.unitId,
      videoCount: isCurrent(active) ? active.videoCount : 0,
    };
  }
  return { open, snapshot };
}
