import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkRelease, parseReleaseArguments } from '../scripts/check-release.js';

const script = fileURLToPath(new URL('../scripts/check-release.js', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const entry = (id) => ({ unitId: id, title: `Unit ${id}`, file: `${id}.json` });
const lecture = (id) => ({
  unitId: id,
  title: `Lecture ${id}`,
  videos: [
    { title: 'Chapter three', url: 'https://youtu.be/aBcDeFgHiJ0' },
    { title: 'Chapter one', url: 'https://youtu.be/aBcDeFgHiJ1' },
  ],
});
const quiz = (id, schemaVersion = 1, count = 4) => ({
  schemaVersion,
  unitId: id,
  title: `Unit ${id}`,
  googleFormUrl: `https://forms.gle/TeacherApproved${id}`,
  questions: Array.from({ length: count }, (_, index) => ({
    id: `Q0${index + 1}`,
    questionVideoUrl: 'https://youtu.be/aBcDeFgHiJ0',
    explanationVideoUrl: 'https://youtu.be/aBcDeFgHiJ1',
    options:
      schemaVersion === 1 ? ['First', 'Second', 'Third', 'Fourth'] : ['First', 'Second', 'Third'],
    ...(schemaVersion === 1 ? { correctOption: 'A' } : { correctOptions: ['A', 'C'] }),
  })),
});
async function fixture(t, { mode = 'quiz', count = 12, open = [] } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'island-release-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const put = async (path, value) => {
    const target = join(root, path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, typeof value === 'string' ? value : JSON.stringify(value));
  };
  await put(
    'index.html',
    '<!doctype html><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./assets/index-abcdefgh.css"><script type="module" src="./assets/index-abcdefgh.js"></script>',
  );
  await put('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await put(
    'assets/index-abcdefgh.js',
    'const demo=false; const token="identifier"; export const correctOption="field";',
  );
  await put('assets/index-abcdefgh.css', 'body { color: #123; }');
  await put('THIRD_PARTY_NOTICES.txt', 'Third-party license statements.');
  await put('course-config.json', {
    courseTitle: '數位電子學',
    totalUnits: count,
    assignmentMode: mode,
  });
  await put('assignments/manifest.json', { schemaVersion: 1, units: open.map(entry) });
  return { root, put };
}
const codes = (report) => report.issues.map((item) => item.code);
const cli = (root, ...args) =>
  spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });

test('release checker inventories actual regular bytes, stays read-only and accepts an empty official course honestly', async (t) => {
  const { root } = await fixture(t);
  const before = await readFile(join(root, 'assignments/manifest.json'));
  const report = await checkRelease({ root });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
  assert.equal(report.files.length, 7);
  assert.deepEqual(
    report.files.map((file) => file.path),
    report.files.map((file) => file.path).sort(),
  );
  assert.equal(
    report.files.find((file) => file.path === 'assignments/manifest.json').sha256,
    hash(before),
  );
  for (const file of report.files) {
    assert.equal(file.bytes, (await readFile(join(root, file.path))).length);
    assert.equal(file.sha256, hash(await readFile(join(root, file.path))));
  }
  assert.equal(report.content.releaseReady, false);
  assert.equal(report.content.quizCompleteness, 'checked');
  assert.match(report.warnings.join(' '), /沒有開放單元/);
  assert.deepEqual(await readFile(join(root, 'assignments/manifest.json')), before);
  assert.ok(!JSON.stringify(report).includes(root));
});

test('release scan accepts runtime vocabulary and W3C namespaces while checking lazy resource references', async (t) => {
  const { root, put } = await fixture(t);
  await put(
    'assets/index-abcdefgh.js',
    'const demo=false, correctOptions=[], token="word"; import("./quiz-runtime-12345678.js"); const deps=["./quiz-runtime-12345678.css"]; const ns="http://www.w3.org/1999/xhtml";',
  );
  await put('assets/quiz-runtime-12345678.js', 'export const schemaVersion=2;');
  await put('assets/quiz-runtime-12345678.css', '');
  assert.equal((await checkRelease({ root })).ok, true);
  await rm(join(root, 'assets/quiz-runtime-12345678.css'));
  assert.ok(codes(await checkRelease({ root })).includes('MISSING_RESOURCE'));
});

test('release scan blocks private, development, backup and unknown files including empty directories', async (t) => {
  const { root, put } = await fixture(t);
  for (const path of [
    '.env',
    '.git/config',
    'node_modules/pkg/index.js',
    'test-results/screenshot.png',
    'assignments/S01.json.bak',
    'assets/main.js.map',
    'notes.txt',
  ]) {
    await put(path, 'private');
  }
  await mkdir(join(root, 'Codex-work-records'));
  const report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.equal(report.issues.filter((item) => item.code === 'UNEXPECTED_FILE').length, 7);
  assert.ok(
    report.issues.some(
      (item) => item.code === 'UNEXPECTED_DIRECTORY' && item.path === 'Codex-work-records',
    ),
  );
});

test('release scan rejects unlisted Lecture or Quiz drafts instead of assuming manifest hides downloadable files', async (t) => {
  const { root, put } = await fixture(t);
  await put('course-videos/S04.json', lecture('S04'));
  await put('assignments/S04.json', quiz('S04'));
  const report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.equal(report.issues.filter((item) => item.code === 'UNLISTED_CONTENT').length, 2);
});

test('release checks every published Quiz through unchanged v1/v2 validation and emits only content counts', async (t) => {
  const { root, put } = await fixture(t, { count: 15, open: ['S01', 'S15'] });
  for (const id of ['S01', 'S15']) {
    await put(`course-videos/${id}.json`, lecture(id));
    await put(`assignments/${id}.json`, quiz(id, id === 'S01' ? 1 : 2, id === 'S01' ? 4 : 5));
  }
  let report = await checkRelease({ root });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
  assert.equal(report.content.releaseReady, true);
  assert.deepEqual(
    report.content.assignments.map((unit) => [unit.schemaVersion, unit.questions]),
    [
      [1, 4],
      [2, 5],
    ],
  );
  assert.deepEqual(
    report.content.lectures.map((unit) => unit.videos),
    [2, 2],
  );
  assert.ok(!JSON.stringify(report).includes('correctOption'));
  assert.ok(!JSON.stringify(report).includes('TeacherApproved'));
  const invalid = quiz('S15', 2, 5);
  invalid.questions[0].correctOptions = ['D'];
  await put('assignments/S15.json', invalid);
  report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.ok(codes(report).includes('CONTENT'));
});

test('release checks video-only without Quiz, rejects accidentally bundled Quiz, and rejects missing or empty Lectures', async (t) => {
  const { root, put } = await fixture(t, { mode: 'video-only', count: 1, open: ['S01'] });
  assert.ok(codes(await checkRelease({ root })).includes('CONTENT'));
  await put('course-videos/S01.json', { ...lecture('S01'), videos: [] });
  assert.ok(codes(await checkRelease({ root })).includes('CONTENT'));
  await put('course-videos/S01.json', lecture('S01'));
  assert.equal((await checkRelease({ root })).ok, true);
  await put('assignments/S01.json', 'not even parsed as Quiz');
  const report = await checkRelease({ root });
  assert.ok(codes(report).includes('VIDEO_ONLY_QUIZ'));
  assert.equal(report.content.quizCompleteness, 'not-required');
});

test('production release catches real Demo payload and APIs even in a normally named hashed JS chunk', async (t) => {
  const { root, put } = await fixture(t);
  for (const text of [
    'const url="https://youtu.be/DEMO0000001"',
    'const form="https://forms.gle/IslandLabDemoS01"',
    'window.__islandLab={snapshot(){}}',
    'export function readDemoLecture() {}',
  ]) {
    await put('assets/index-abcdefgh.js', text);
    const report = await checkRelease({ root });
    assert.equal(report.ok, false);
    assert.ok(codes(report).some((code) => ['DEMO_DATA', 'DEV_API'].includes(code)));
  }
});

test('private key and token findings never print the matched secret value in scan receipts or CLI', async (t) => {
  const { root, put } = await fixture(t);
  const secret = 'ghp_' + 'a'.repeat(36);
  await put(
    'assets/index-abcdefgh.js',
    `const credential="${secret}"; const password="synthetic-secret-value";`,
  );
  let report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.ok(codes(report).includes('CREDENTIAL'));
  assert.ok(codes(report).includes('SECRET_VALUE'));
  assert.ok(!JSON.stringify(report).includes(secret));
  const result = cli(root, '--json');
  assert.equal(result.status, 1);
  assert.ok(!result.stdout.includes(secret));
  assert.ok(!result.stdout.includes('synthetic-secret-value'));
  await put('assets/index-abcdefgh.js', '-----BEGIN PRIVATE KEY-----');
  report = await checkRelease({ root });
  assert.ok(codes(report).includes('PRIVATE_KEY'));
  await put('course-config.json', { courseTitle: secret, totalUnits: 12, assignmentMode: 'quiz' });
  await put('assignments/manifest.json', {
    schemaVersion: 1,
    units: [{ ...entry('S01'), title: secret }],
  });
  report = await checkRelease({ root });
  assert.equal(report.course.courseTitle, '[redacted]');
  assert.equal(report.manifest.units[0].title, '[redacted]');
  assert.ok(!JSON.stringify(report).includes(secret));
});

test('local machine paths, loopback URLs and source map pointers cannot reach the RC', async (t) => {
  const { root, put } = await fixture(t);
  for (const [text, code] of [
    ['const base="http://localhost:5173/"', 'LOCAL_URL'],
    ['const base="http://127.0.0.1:4173/"', 'LOCAL_URL'],
    ['const local="/workspace/private/project.js"', 'LOCAL_PATH'],
    ['//# sourceMappingURL=index.js.map', 'SOURCE_MAP'],
  ]) {
    await put('assets/index-abcdefgh.js', text);
    assert.ok(codes(await checkRelease({ root })).includes(code));
  }
});

test('missing HTML, missing notices, malformed course, out-of-course Manifest and title mismatch fail closed', async (t) => {
  const { root, put } = await fixture(t);
  await rm(join(root, 'index.html'));
  await put('THIRD_PARTY_NOTICES.txt', '  ');
  await put('course-config.json', '{broken');
  let report = await checkRelease({ root });
  for (const code of ['MISSING', 'NOTICE', 'COURSE']) assert.ok(codes(report).includes(code));
  await put('course-config.json', { courseTitle: 'Course', totalUnits: 1, assignmentMode: 'quiz' });
  await put('assignments/manifest.json', { schemaVersion: 1, units: [entry('S15')] });
  assert.ok(codes(await checkRelease({ root })).includes('MANIFEST'));
  await put('assignments/manifest.json', { schemaVersion: 1, units: [entry('S01')] });
  await put('course-videos/S01.json', lecture('S01'));
  await put('assignments/S01.json', { ...quiz('S01'), title: 'Different title' });
  report = await checkRelease({ root });
  assert.ok(codes(report).includes('CONTENT'));
});

test('absolute HTML and CSS resources and root escapes fail relative subdirectory deployment checks', async (t) => {
  const { root, put } = await fixture(t);
  await put(
    'index.html',
    '<script src="/assets/index-abcdefgh.js"></script><link href="https://cdn.invalid/app.css">',
  );
  await put(
    'assets/index-abcdefgh.css',
    'a {background:url(../../outside.svg)} @import "https://cdn.invalid/a.css";',
  );
  const report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.equal(report.issues.filter((item) => item.code === 'RESOURCE_PATH').length, 3);
  assert.ok(codes(report).includes('MISSING_RESOURCE'));
  await put('index.html', '<link rel="icon" href="%2Ffavicon.svg">');
  assert.ok(codes(await checkRelease({ root })).includes('RESOURCE_PATH'));
});

test('symlinks are rejected before content validation can follow a link outside the release root', async (t) => {
  const { root } = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), 'island-release-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(join(outside, 'secret.txt'), 'DO_NOT_READ_THIS_VALUE');
  try {
    await symlink(join(outside, 'secret.txt'), join(root, 'assets/link-abcdefgh.js'), 'file');
  } catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') {
      t.skip('Windows 無 symlink 權限；Linux CI 實測此案例');
      return;
    }
    throw error;
  }
  const report = await checkRelease({ root });
  assert.ok(codes(report).includes('FILE_TYPE'));
  assert.equal(report.content, null);
  assert.ok(!JSON.stringify(report).includes('DO_NOT_READ_THIS_VALUE'));
  assert.equal(
    report.files.some((file) => file.path.includes('link-')),
    false,
  );
});

test('missing release root returns a safe failure without exposing an absolute path', async () => {
  const root = join(tmpdir(), 'absent-release-check-directory-313b15d');
  const report = await checkRelease({ root });
  assert.equal(report.ok, false);
  assert.deepEqual(codes(report), ['ROOT']);
  assert.ok(!JSON.stringify(report).includes(root));
});

test('release CLI returns 0 for success, 1 for unsafe output, 2 for argument errors and no side effects', async (t) => {
  const { root, put } = await fixture(t);
  const success = cli(root, '--json');
  assert.equal(success.status, 0, success.stderr);
  assert.equal(JSON.parse(success.stdout).ok, true);
  await put('teacher-private-draft.json', '{}');
  assert.equal(cli(root).status, 1);
  for (const args of [
    ['--unknown'],
    ['--root'],
    ['--root', 'x', '--root', 'y'],
    ['--json', '--json'],
  ])
    assert.throws(() => parseReleaseArguments(args));
  const invalid = spawnSync(process.execPath, [script, '--unknown'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /check:release/);
});
