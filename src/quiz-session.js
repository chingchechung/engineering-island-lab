import { normalizeUnit, validateUnit, validateOrThrow, acceptsAnswer } from './quiz-contract.js';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// Object property order is immaterial; array order (questions/options) is not.
function fingerprint(value) {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${fingerprint(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function createSession(unit) {
  const passed = new Set();
  return Object.freeze({
    unit,
    unitId: unit.unitId,
    questions: unit.questions,
    get total() {
      return unit.questions.length;
    },
    get count() {
      return passed.size;
    },
    get complete() {
      return passed.size === unit.questions.length;
    },
    question(id) {
      return unit.questions.find((question) => question.id === id) ?? null;
    },
    hasPassed(id) {
      return passed.has(id);
    },
    answer(id, selected) {
      const question = unit.questions.find((item) => item.id === id);
      const correct = acceptsAnswer(question, selected);
      if (correct) passed.add(id);
      return correct;
    },
    snapshot() {
      const complete = passed.size === unit.questions.length;
      return Object.freeze({
        unitId: unit.unitId,
        total: unit.questions.length,
        count: passed.size,
        complete,
        passedIds: Object.freeze(unit.questions.filter((q) => passed.has(q.id)).map((q) => q.id)),
        formUrl: complete ? unit.googleFormUrl : null,
      });
    },
  });
}

// Page-memory only. Island/camera changes never replace an existing attempt.
// A different export for an already-active unit needs a full page reload so an
// old pass cannot accidentally authorize new content or another unit's Form.
export function createQuizSessions() {
  const sessions = new Map();
  const signatures = new Map();
  return Object.freeze({
    activate(data) {
      validateOrThrow(validateUnit(data), '作業資料');
      const unit = normalizeUnit(data);
      const signature = fingerprint(unit);
      if (sessions.has(unit.unitId)) {
        if (signatures.get(unit.unitId) !== signature)
          throw new Error(`${unit.unitId} 已載入不同的作業內容；請重新整理頁面後再載入新版本。`);
        return sessions.get(unit.unitId);
      }
      const session = createSession(freeze(unit));
      signatures.set(unit.unitId, signature);
      sessions.set(unit.unitId, session);
      return session;
    },
    get(unitId) {
      return sessions.get(unitId) ?? null;
    },
    snapshot() {
      return Object.freeze([...sessions.values()].map((session) => session.snapshot()));
    },
  });
}
