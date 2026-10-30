import {
  normalizeManifest,
  normalizeUnit,
  validateManifest,
  validateUnit,
} from './quiz-contract.js';

const UNIT_ID = /^S(0[1-9]|1[0-5])$/;
const REQUEST_TIMEOUT_MS = 15_000;

export class QuizDataError extends Error {
  constructor(code, message, { issues = [], cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'QuizDataError';
    this.code = code;
    // Keep the original ordered diagnostic objects rather than only a summary.
    this.issues = issues;
  }
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function checkUnitId(unitId, totalUnits) {
  if (
    typeof unitId !== 'string' ||
    unitId.length !== 3 ||
    !UNIT_ID.test(unitId) ||
    Number(unitId.slice(1)) > totalUnits
  )
    throw new QuizDataError('INVALID', '作業單元必須是課程範圍內的 S01–S15');
}

function invalid(issues, description) {
  if (!issues.length) return;
  throw new QuizDataError(
    'INVALID',
    `${description}：${issues
      .slice(0, 3)
      .map((issue) => `${issue.path} ${issue.message}`)
      .join('；')}`,
    { issues },
  );
}

function sourceError(error, unitId) {
  if (error instanceof QuizDataError) return error;
  if (error instanceof SyntaxError)
    return new QuizDataError('JSON', `${unitId} 作業 JSON 格式無效`, { cause: error });
  if (['HTTP', 'JSON', 'INVALID', 'NETWORK', 'CANCELLED'].includes(error?.code))
    return new QuizDataError(error.code, `${unitId} ${error.message}`, {
      issues: error.issues ?? [],
      cause: error,
    });
  if (error?.name === 'AbortError')
    return new QuizDataError('CANCELLED', `${unitId} 作業載入已取消`, { cause: error });
  return new QuizDataError('NETWORK', `${unitId} 作業內容載入失敗，請檢查網路並重試`, {
    cause: error,
  });
}

// Follows the Phase 3 fixed-path, validated cache/single-flight boundary. Each
// island owns its request identity so loading another island cannot cancel it.
export function createQuizLoader({
  baseUrl,
  totalUnits,
  manifest,
  fetchImpl = globalThis.fetch,
  readDemo = null,
}) {
  if (!Number.isInteger(totalUnits) || totalUnits < 1 || totalUnits > 15)
    throw new QuizDataError('INVALID', 'totalUnits 必須是 1–15 的整數');
  invalid(validateManifest(manifest), '作業發布清單無效');
  const normalizedManifest = normalizeManifest(manifest);
  for (const entry of normalizedManifest.units) checkUnitId(entry.unitId, totalUnits);
  // Snapshot the allowlist: later mutations of the caller's object grant nothing.
  const open = new Map(normalizedManifest.units.map((entry) => [entry.unitId, freeze(entry)]));
  if (readDemo !== null && typeof readDemo !== 'function')
    throw new TypeError('readDemo 必須是函式');
  if (readDemo === null && typeof fetchImpl !== 'function')
    throw new TypeError('fetchImpl 必須是函式');
  const directory = readDemo ? null : new URL('./', baseUrl);
  const cache = new Map();
  const pending = new Map();

  async function read(unitId, signal) {
    if (readDemo) return readDemo(unitId, { signal });
    // Neither manifest.file nor response data can select a path or origin.
    const response = await fetchImpl(new URL(`./assignments/${unitId}.json`, directory), {
      cache: 'no-store',
      redirect: 'error',
      signal,
    });
    if (!response.ok)
      throw new QuizDataError('HTTP', `${unitId} 作業內容載入失敗（HTTP ${response.status}）`);
    try {
      return await response.json();
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw new QuizDataError('JSON', `${unitId} 作業 JSON 格式無效`, { cause: error });
    }
  }

  async function load(unitId) {
    checkUnitId(unitId, totalUnits);
    if (!open.has(unitId)) throw new QuizDataError('LOCKED', `${unitId} 尚未開放作業`);
    if (cache.has(unitId)) return cache.get(unitId);
    if (pending.has(unitId)) return pending.get(unitId).promise;

    const controller = new AbortController();
    const { signal } = controller;
    const request = { controller, promise: null };
    const current = () => pending.get(unitId) === request && !signal.aborted;
    let rejectAbort;
    const aborted = new Promise((_, reject) => {
      rejectAbort = () => reject(signal.reason);
      signal.addEventListener('abort', rejectAbort, { once: true });
    });
    const timer = setTimeout(() => {
      controller.abort(new QuizDataError('NETWORK', `${unitId} 作業載入逾時，請稍後重試`));
    }, REQUEST_TIMEOUT_MS);

    request.promise = Promise.race([
      Promise.resolve().then(() => {
        if (!current()) throw new QuizDataError('CANCELLED', `${unitId} 作業載入已取消`);
        return read(unitId, signal);
      }),
      aborted,
    ])
      .then((value) => {
        if (!current()) throw new QuizDataError('CANCELLED', `${unitId} 作業載入已取消`);
        invalid(validateUnit(value, `${unitId}.json`), `${unitId} 作業資料驗證失敗`);
        const unit = normalizeUnit(value);
        if (unit.title !== open.get(unitId).title)
          invalid(
            [{ path: '$.title', code: 'title_mismatch', message: '題庫標題必須與發布清單一致。' }],
            `${unitId} 作業資料驗證失敗`,
          );
        const data = freeze(unit);
        cache.set(unitId, data);
        return data;
      })
      .catch((error) => {
        throw sourceError(error, unitId);
      })
      .finally(() => {
        clearTimeout(timer);
        signal.removeEventListener('abort', rejectAbort);
        if (pending.get(unitId) === request) pending.delete(unitId);
      });
    pending.set(unitId, request);
    return request.promise;
  }

  function cancel(unitId) {
    if (unitId !== undefined) checkUnitId(unitId, totalUnits);
    const requests =
      unitId === undefined ? [...pending.entries()] : [[unitId, pending.get(unitId)]];
    for (const [id, request] of requests) {
      if (!request) continue;
      pending.delete(id);
      request.controller.abort(new QuizDataError('CANCELLED', `${id} 作業載入已取消`));
    }
  }

  function clearCache() {
    cancel();
    cache.clear();
  }

  return Object.freeze({ load, cancel, clearCache });
}
