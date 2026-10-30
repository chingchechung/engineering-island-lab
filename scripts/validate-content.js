import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCourseConfig, validateManifest } from '../src/config.js';
import { validateLecture, validateUnitId } from '../src/lecture-data.js';

const USAGE = '用法：npm run validate:content -- [--unit S04] [--root <public-directory>]';

export function parseArguments(args) {
  const options = { root: resolve('public'), unitId: null, help: false },
    seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (!['--root', '--unit'].includes(argument) || seen.has(argument))
      throw new Error(`不支援或重複的參數：${argument}`);
    seen.add(argument);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${argument} 缺少值`);
    if (argument === '--root') options.root = resolve(value);
    else options.unitId = validateUnitId(value);
  }
  return options;
}

async function readJson(root, relative) {
  let text;
  try {
    text = await readFile(join(root, relative), 'utf8');
  } catch (error) {
    throw new Error(
      `${relative}：${error.code === 'ENOENT' ? '找不到檔案' : `無法讀取檔案（${error.code}）`}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${relative}：JSON 格式無效`);
  }
}

export async function validateContent({ root = resolve('public'), unitId = null } = {}) {
  const report = {
    ok: false,
    scope: unitId ? 'candidate' : 'published',
    course: null,
    lectures: [],
    errors: [],
    warnings: [],
    quizCompleteness: 'unsupported',
    releaseReady: false,
  };
  let manifest;
  try {
    report.course = validateCourseConfig(await readJson(root, 'course-config.json'));
    manifest = validateManifest(
      await readJson(root, 'assignments/manifest.json'),
      report.course.totalUnits,
    );
    if (unitId !== null) validateUnitId(unitId, report.course.totalUnits);
  } catch (error) {
    report.errors.push(error.message);
    return report;
  }
  const quiz = report.course.assignmentMode === 'quiz';
  report.quizCompleteness = quiz ? 'unsupported' : 'not-required';
  if (quiz)
    report.warnings.push(
      'Quiz 完整性：尚未支援（Phase 4）；本工具未讀取或驗證題庫，不能宣稱整個作業已準備完成。',
    );
  const units = unitId ? [unitId] : manifest.units.map((unit) => unit.unitId);
  for (const id of units) {
    try {
      const data = validateLecture(
        await readJson(root, `course-videos/${id}.json`),
        id,
        report.course.totalUnits,
      );
      if (!data.videos.length) throw new Error(`${id} 本單元尚無課程影片；發布檢查不接受空清單`);
      report.lectures.push(data);
    } catch (error) {
      report.errors.push(error.message);
    }
  }
  if (!unitId && quiz && manifest.units.length)
    report.errors.push(
      '正式 Quiz 發布檢查未通過：Phase 4 題庫完整性尚未支援，只有 Lecture 有效仍不能發布未完成作業。',
    );
  if (unitId)
    report.warnings.push('此結果只驗證候選 Lecture，不代表作業或正式發布就緒；發布清單沒有變更。');
  else if (!units.length) report.warnings.push('Manifest 沒有開放單元；沒有教材將被發布。');
  report.ok = report.errors.length === 0;
  report.releaseReady = report.ok && !unitId && !quiz && units.length > 0;
  return report;
}

export function formatReport(report) {
  const lines = ['Engineering Island Lab — Content Validator（唯讀）'];
  if (report.course)
    lines.push(
      `課程：${report.course.courseTitle}；${report.course.totalUnits} 單元；模式 ${report.course.assignmentMode}`,
    );
  lines.push(
    report.scope === 'candidate' ? '範圍：單一候選 Lecture' : '範圍：Manifest 已開放單元的 Lecture',
  );
  if (report.quizCompleteness === 'not-required')
    lines.push('Video-only 不需要題庫；本工具不讀取 assignments/Sxx.json。');
  for (const lecture of report.lectures) {
    lines.push(
      `${lecture.unitId} Lecture 有效（${lecture.videos.length} 部）；依 JSON 原陣列順序列出：`,
    );
    lecture.videos.forEach((video, index) =>
      lines.push(`  ${index + 1}. ${video.title} — ${video.url}`),
    );
  }
  for (const warning of report.warnings) lines.push(`注意：${warning}`);
  for (const error of report.errors) lines.push(`錯誤：${error}`);
  lines.push(report.ok ? '結果：指定範圍的資料檢查通過。' : '結果：資料檢查未通過。');
  lines.push('本工具不更動 Manifest、不寫入教材、不部署網站。');
  return lines.join('\n');
}

export async function main(args = process.argv.slice(2), output = console) {
  let options;
  try {
    options = parseArguments(args);
  } catch (error) {
    output.error(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    output.log(USAGE);
    return 0;
  }
  const report = await validateContent(options);
  output.log(formatReport(report));
  return report.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  process.exitCode = await main();
