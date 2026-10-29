export function validateCourseConfig(value) {
  if (!value || typeof value.courseTitle !== 'string' || !value.courseTitle.trim()) {
    throw new Error('courseTitle 必須是非空文字');
  }
  if (!Number.isInteger(value.totalUnits) || value.totalUnits < 1 || value.totalUnits > 15) {
    throw new Error('totalUnits 必須是 1–15 的整數');
  }
  if (!['quiz', 'video-only'].includes(value.assignmentMode)) {
    throw new Error('assignmentMode 必須是 quiz 或 video-only');
  }
  return {
    courseTitle: value.courseTitle.trim(),
    totalUnits: value.totalUnits,
    assignmentMode: value.assignmentMode,
  };
}

export function validateManifest(value, totalUnits) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.units))
    throw new Error('發布清單格式無效');
  const seen = new Set();
  for (const unit of value.units) {
    if (
      !unit ||
      !/^S(0[1-9]|1[0-5])$/.test(unit.unitId) ||
      Number(unit.unitId.slice(1)) > totalUnits ||
      seen.has(unit.unitId) ||
      unit.file !== `${unit.unitId}.json` ||
      typeof unit.title !== 'string' ||
      !unit.title.trim()
    ) {
      throw new Error('發布清單包含無效、重複或超出範圍的單元');
    }
    seen.add(unit.unitId);
  }
  return value;
}

async function loadJson(path, baseUrl) {
  const response = await fetch(new URL(path, baseUrl));
  if (!response.ok) throw new Error(`設定載入失敗（HTTP ${response.status}）`);
  try {
    return await response.json();
  } catch {
    throw new Error('設定 JSON 格式無效');
  }
}

export async function loadCourseConfig(baseUrl) {
  return validateCourseConfig(await loadJson('./course-config.json', baseUrl));
}
export async function loadManifest(baseUrl, totalUnits) {
  return validateManifest(await loadJson('./assignments/manifest.json', baseUrl), totalUnits);
}

// Demo is opt-in. A query parameter cannot enable Demo on a production build.
export function isLocalDemo(search, isDevelopment) {
  return isDevelopment && new URLSearchParams(search).get('demo') === '1';
}
