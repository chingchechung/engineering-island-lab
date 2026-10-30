import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCourseConfig, validateManifest } from '../src/config.js';
import { validateContent } from './validate-content.js';

const USAGE = '用法：npm run check:release -- [--root <dist-directory>] [--json]';
const REQUIRED = [
  'index.html',
  'favicon.svg',
  'course-config.json',
  'assignments/manifest.json',
  'THIRD_PARTY_NOTICES.txt',
];
const ASSET = /^assets\/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8,}\.(?:js|css)$/;
const UNIT_FILE = /^(course-videos|assignments)\/(S(?:0[1-9]|1[0-5]))\.json$/;
const DIRECTORY = new Set(['assets', 'assignments', 'course-videos']);
const SCANS = [
  [
    'DEMO_DATA',
    /(?:DEMO|TEST)\d{7}|IslandLabDemo|本機 Lecture 示範清單|合成解說：這裡只驗證/,
    '含已知合成教材或測試連結。',
  ],
  [
    'DEV_API',
    /__islandLab|createDemoQuizReader|readDemoLecture|\/@vite\/client|\/@react-refresh/,
    '含開發專用 API 或 fixture 入口。',
  ],
  [
    'LOCAL_URL',
    /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])(?=[:/?#\s"'`]|$)/i,
    '含本機測試伺服器網址。',
  ],
  [
    'LOCAL_PATH',
    /(?:[A-Za-z]:\\(?:Users|workspace|Temp)\\|\/(?:workspace|Users|home)\/)[A-Za-z0-9_.-]+/,
    '含開發機器絕對路徑。',
  ],
  [
    'SOURCE_MAP',
    /(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=/,
    '含 source map 指示，請重新產生正式 build。',
  ],
  [
    'PRIVATE_KEY',
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
    '含私密金鑰標記。',
  ],
  [
    'CREDENTIAL',
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b|\bnpm_[A-Za-z0-9]{36,}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
    '含高可信度的憑證格式。',
  ],
  [
    'SECRET_VALUE',
    /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)["'`]?\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/i,
    '含疑似硬編碼的私密設定。',
  ],
];

const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const safePath = (value) => (/[\u0000-\u001f\u007f]/.test(value) ? '[invalid path]' : value);
const publicText = (value) =>
  SCANS.some(([, pattern]) => pattern.test(value)) ? '[redacted]' : value;

// This is a build-output allowlist, not a secret detector or publication approval.
// No input source text, secret match, answer, or local absolute path is returned.
export async function checkRelease({ root = 'dist' } = {}) {
  const report = {
    ok: false,
    files: [],
    course: null,
    manifest: null,
    issues: [],
    warnings: [],
    content: null,
  };
  const buffers = new Map();
  const issue = (code, path, message) =>
    report.issues.push({ code, path: safePath(path), message });
  let unsafeTree = false;
  const absolute = resolve(root);
  try {
    const stat = await lstat(absolute);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      issue('ROOT', '.', '發布根目錄必須是實體目錄，不可為 symbolic link。');
      return report;
    }
  } catch {
    issue('ROOT', '.', '無法讀取發布根目錄。');
    return report;
  }

  async function walk(relative = '') {
    let entries;
    try {
      entries = await readdir(join(absolute, relative), { withFileTypes: true });
    } catch {
      unsafeTree = true;
      issue('READ', relative || '.', '無法讀取發布目錄。');
      return;
    }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      // lstat again so a swapped directory entry cannot silently become a link.
      let stat;
      try {
        stat = await lstat(join(absolute, path));
      } catch {
        unsafeTree = true;
        issue('READ', path, '無法讀取發布檔案資訊。');
        continue;
      }
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
        unsafeTree = true;
        issue('FILE_TYPE', path, '僅允許一般靜態檔，不可包含 link 或特殊檔案。');
      } else if (stat.isDirectory()) {
        if (!DIRECTORY.has(path)) issue('UNEXPECTED_DIRECTORY', path, '不是核准的靜態網站目錄。');
        await walk(path);
      } else {
        try {
          const buffer = await readFile(join(absolute, path));
          buffers.set(path, buffer);
          report.files.push({ path: safePath(path), bytes: buffer.length, sha256: digest(buffer) });
          const text = buffer.toString('utf8');
          for (const [code, pattern, message] of SCANS)
            if (pattern.test(text)) issue(code, path, message);
        } catch {
          unsafeTree = true;
          issue('READ', path, '無法讀取發布檔案。');
        }
      }
    }
  }
  await walk();
  report.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const path of REQUIRED)
    if (!buffers.has(path)) issue('MISSING', path, '缺少必要的正式靜態檔案。');
  if (
    buffers.has('THIRD_PARTY_NOTICES.txt') &&
    !buffers.get('THIRD_PARTY_NOTICES.txt').toString('utf8').trim()
  )
    issue('NOTICE', 'THIRD_PARTY_NOTICES.txt', '第三方授權聲明不得為空白。');

  try {
    report.course = validateCourseConfig(
      JSON.parse(buffers.get('course-config.json')?.toString('utf8')),
    );
    report.course.courseTitle = publicText(report.course.courseTitle);
  } catch {
    issue(
      'COURSE',
      'course-config.json',
      '課程設定必須為有效 JSON，課名非空、單元數 1–15、明確 quiz／video-only。',
    );
  }
  try {
    if (report.course) {
      const manifest = validateManifest(
        JSON.parse(buffers.get('assignments/manifest.json')?.toString('utf8')),
        report.course.totalUnits,
      );
      report.manifest = {
        schemaVersion: manifest.schemaVersion,
        units: manifest.units.map((unit) => ({ ...unit, title: publicText(unit.title) })),
      };
    }
  } catch {
    issue(
      'MANIFEST',
      'assignments/manifest.json',
      'Manifest 必須符合既有 schema、單元範圍及精確相對檔名規則。',
    );
  }
  const open = new Set(report.manifest?.units.map((unit) => unit.unitId) ?? []);
  for (const path of buffers.keys()) {
    if (REQUIRED.includes(path) || ASSET.test(path)) continue;
    const match = UNIT_FILE.exec(path);
    if (!match) {
      issue('UNEXPECTED_FILE', path, '不是核准的正式網站檔案；草稿、測試、備份及私密檔不得封裝。');
    } else if (!open.has(match[2])) {
      issue('UNLISTED_CONTENT', path, '未列入 Manifest 的教材不可預放公開路徑。');
    } else if (match[1] === 'assignments' && report.course?.assignmentMode === 'video-only') {
      issue('VIDEO_ONLY_QUIZ', path, 'Video-only 正式封裝不應夾帶題庫檔。');
    }
  }

  // Verify local HTML resources and the actual Vite-generated JS/CSS graph,
  // including lazy Quiz imports. W3C namespaces and library bibliography URLs
  // are metadata, not resource requests, and are deliberately not blocked.
  function reference(path, raw, { data = false } = {}) {
    const value = raw.trim();
    if (value.startsWith('#') || (data && value.startsWith('data:'))) return;
    if (
      !value ||
      value.startsWith('/') ||
      /^[a-z][a-z\d+.-]*:/i.test(value) ||
      value.includes('\\')
    ) {
      issue('RESOURCE_PATH', path, '載入資源必須使用網站根目錄內的相對路徑。');
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(value.split(/[?#]/)[0]);
    } catch {
      issue('RESOURCE_PATH', path, '載入資源路徑編碼無效。');
      return;
    }
    if (decoded.startsWith('/') || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
      issue('RESOURCE_PATH', path, '載入資源編碼後必須仍為網站根目錄內的相對路徑。');
      return;
    }
    const target = posix.normalize(posix.join(dirname(path).replaceAll('\\', '/'), decoded));
    if (target === '..' || target.startsWith('../') || !buffers.has(target))
      issue('MISSING_RESOURCE', path, 'HTML／JS／CSS 引用的相對資源不存在或超出網站根目錄。');
  }
  for (const [path, buffer] of buffers) {
    const text = buffer.toString('utf8');
    if (path === 'index.html') {
      for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))
        reference(path, match[1]);
    } else if (ASSET.test(path) && path.endsWith('.js')) {
      for (const match of text.matchAll(
        /["'`](\.{1,2}\/[^"'`\s]+\.(?:js|css|svg)(?:[?#][^"'`\s]*)?)["'`]/g,
      ))
        reference(path, match[1]);
    } else if (ASSET.test(path) && path.endsWith('.css')) {
      for (const match of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi))
        reference(path, match[1], { data: true });
      for (const match of text.matchAll(/@import\s+["']([^"']+)["']/gi)) reference(path, match[1]);
    }
  }

  if (!unsafeTree && report.course && report.manifest) {
    const content = await validateContent({ root: absolute });
    report.content = {
      ok: content.ok,
      scope: content.scope,
      quizCompleteness: content.quizCompleteness,
      releaseReady: content.releaseReady,
      lectures: content.lectures.map((unit) => ({
        unitId: unit.unitId,
        videos: unit.videos.length,
      })),
      assignments: content.assignments.map((unit) => ({
        unitId: unit.unitId,
        schemaVersion: unit.schemaVersion,
        questions: unit.questions.length,
      })),
      errorCount: content.errors.length,
    };
    if (!content.ok)
      issue(
        'CONTENT',
        '.',
        '已開放 Lecture／Quiz 未通過既有內容驗證；請在本機執行 validate:content 查看詳細資料。',
      );
    if (!open.size)
      report.warnings.push('Manifest 沒有開放單元；空清單有效，但沒有教材已發布或作業已準備完成。');
  }
  report.warnings.push(
    '檔案掃描與格式通過不等於教師發布許可，也無法判定任意文字是否為未公開教材；仍須人工核對內容與網址。',
  );
  report.ok = report.issues.length === 0;
  return report;
}

export function parseReleaseArguments(args) {
  const options = { root: 'dist', json: false, help: false },
    seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error('不接受重複參數');
    seen.add(arg);
    if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--root') {
      const value = args[++index];
      if (!value || value.startsWith('-')) throw new Error('--root 缺少目錄');
      options.root = value;
    } else throw new Error('不支援的參數');
  }
  return options;
}

export async function main(args = process.argv.slice(2), output = console) {
  let options;
  try {
    options = parseReleaseArguments(args);
  } catch (error) {
    output.error(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    output.log(USAGE);
    return 0;
  }
  const report = await checkRelease(options);
  if (options.json) output.log(JSON.stringify(report, null, 2));
  else {
    output.log(
      `Release Candidate 實際檔案檢查：${report.ok ? '通過' : '未通過'}（${report.files.length} 檔）`,
    );
    if (report.course)
      output.log(
        `課程：${report.course.totalUnits} 單元／${report.course.assignmentMode}；已開放 ${report.manifest?.units.length ?? 0} 單元`,
      );
    for (const item of report.issues) output.error(`${item.code} ${item.path}：${item.message}`);
    for (const warning of report.warnings) output.log(`注意：${warning}`);
  }
  return report.ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  process.exitCode = await main();
