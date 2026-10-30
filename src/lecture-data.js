import { validateManifest } from './config.js';

const UNIT_ID = /^S(0[1-9]|1[0-5])$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const WATCH_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export class LectureDataError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'LectureDataError';
    this.code = code;
  }
}

export function validateUnitId(unitId, totalUnits = 15) {
  if (!Number.isInteger(totalUnits) || totalUnits < 1 || totalUnits > 15)
    throw new LectureDataError('INVALID', 'totalUnits 必須是 1–15 的整數');
  if (typeof unitId !== 'string' || !UNIT_ID.test(unitId) || Number(unitId.slice(1)) > totalUnits)
    throw new LectureDataError('INVALID', 'Lecture 單元必須是課程範圍內的 S01–S15');
  return unitId;
}

// Validate the destination without normalizing, replacing or sorting source URLs.
// URL alone is deliberately insufficient: it repairs whitespace, backslashes and
// percent-encoded hostnames that should not be accepted as teacher input.
export function validateYouTubeUrl(value) {
  const invalid = () => {
    throw new LectureDataError('INVALID', '影片網址必須是有效的 HTTPS YouTube 影片連結');
  };
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f\\]/.test(value)) invalid();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    invalid();
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) invalid();
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1]?.toLowerCase();
  if (authority !== parsed.hostname && authority !== `${parsed.hostname}:443`) invalid();
  if (parsed.hostname === 'youtu.be') {
    if (!/^\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname)) invalid();
  } else if (WATCH_HOSTS.has(parsed.hostname)) {
    const ids = parsed.searchParams.getAll('v');
    if (parsed.pathname !== '/watch' || ids.length !== 1 || !VIDEO_ID.test(ids[0])) invalid();
  } else invalid();
  return value;
}

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateLecture(value, expectedUnitId, totalUnits = 15) {
  validateUnitId(expectedUnitId, totalUnits);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value.unitId !== expectedUnitId ||
    !nonempty(value.title) ||
    !Array.isArray(value.videos)
  )
    throw new LectureDataError('INVALID', `${expectedUnitId} Lecture 資料格式無效或單元編號不符`);
  const videos = Array.from(value.videos, (video, index) => {
    if (!video || typeof video !== 'object' || Array.isArray(video) || !nonempty(video.title))
      throw new LectureDataError(
        'INVALID',
        `${expectedUnitId} 第 ${index + 1} 部影片標題必須是非空文字`,
      );
    try {
      validateYouTubeUrl(video.url);
    } catch (error) {
      throw new LectureDataError(
        'INVALID',
        `${expectedUnitId} 第 ${index + 1} 部影片：${error.message}`,
        { cause: error },
      );
    }
    return Object.freeze({ title: video.title, url: video.url });
  });
  return Object.freeze({ unitId: value.unitId, title: value.title, videos: Object.freeze(videos) });
}

function sourceError(error, unitId) {
  if (error instanceof LectureDataError) return error;
  if (error instanceof SyntaxError)
    return new LectureDataError('JSON', `${unitId} 課程影片 JSON 格式無效`, { cause: error });
  if (['HTTP', 'JSON', 'INVALID', 'NETWORK'].includes(error?.code))
    return new LectureDataError(error.code, `${unitId} ${error.message}`, { cause: error });
  return new LectureDataError('NETWORK', `${unitId} 課程影片載入失敗，請稍後重試`, {
    cause: error,
  });
}

export function createLectureLoader({
  baseUrl,
  totalUnits,
  manifest,
  fetchImpl = globalThis.fetch,
  readDemo = null,
}) {
  validateUnitId('S01', totalUnits);
  validateManifest(manifest, totalUnits);
  const open = new Set(manifest.units.map((unit) => unit.unitId));
  const cache = new Map(),
    pending = new Map();
  let generation = 0;
  if (readDemo !== null && typeof readDemo !== 'function')
    throw new TypeError('readDemo 必須是函式');
  if (readDemo === null && typeof fetchImpl !== 'function')
    throw new TypeError('fetchImpl 必須是函式');
  // Resolve the document's directory once. Neither manifest.file nor response
  // content participates in constructing the fixed Lecture request path.
  const directory = readDemo ? null : new URL('./', baseUrl);

  async function read(unitId) {
    if (readDemo) {
      try {
        return await readDemo(unitId);
      } catch (error) {
        throw sourceError(error, unitId);
      }
    }
    let response;
    try {
      response = await fetchImpl(new URL(`./course-videos/${unitId}.json`, directory));
    } catch (error) {
      throw sourceError(error, unitId);
    }
    if (!response.ok)
      throw new LectureDataError('HTTP', `${unitId} 課程影片載入失敗（HTTP ${response.status}）`);
    try {
      return await response.json();
    } catch (error) {
      throw new LectureDataError('JSON', `${unitId} 課程影片 JSON 格式無效`, { cause: error });
    }
  }

  async function load(unitId) {
    validateUnitId(unitId, totalUnits);
    if (!open.has(unitId)) throw new LectureDataError('LOCKED', `${unitId} 尚未開放課程影片`);
    if (cache.has(unitId)) return cache.get(unitId);
    if (pending.has(unitId)) return pending.get(unitId);
    const started = generation;
    const request = read(unitId).then((value) => {
      const data = validateLecture(value, unitId, totalUnits);
      if (started === generation) cache.set(unitId, data);
      return data;
    });
    pending.set(unitId, request);
    try {
      return await request;
    } finally {
      if (pending.get(unitId) === request) pending.delete(unitId);
    }
  }

  function clearCache() {
    generation++;
    cache.clear();
    pending.clear();
  }
  return { load, clearCache };
}
