import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { formatReport, parseArguments, validateContent } from '../scripts/validate-content.js';

const script = fileURLToPath(new URL('../scripts/validate-content.js', import.meta.url));
const item = (unitId) => ({ unitId, title: `Unit ${unitId}`, file: `${unitId}.json` });
const lesson = (id = 'S01', numbers = [4, 1, 3, 2]) => ({
  unitId: id,
  title: '中文 Lecture',
  videos: numbers.map((n) => ({
    title: `影片 ${n}`,
    url: `https://youtu.be/TEST${String(n).padStart(7, '0')}`,
  })),
});
async function fixture(t, { mode = 'video-only', count = 12, open = [] } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'island-content-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'assignments'));
  await mkdir(join(root, 'course-videos'));
  const put = async (relative, value) =>
    writeFile(join(root, relative), typeof value === 'string' ? value : JSON.stringify(value));
  await put('course-config.json', {
    courseTitle: '數位電子學',
    totalUnits: count,
    assignmentMode: mode,
  });
  await put('assignments/manifest.json', { schemaVersion: 1, units: open.map(item) });
  return { root, put };
}
const cli = (root, ...args) =>
  spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });

test('empty official Quiz manifest passes structural validation while explicitly marking Phase4 unsupported', async (t) => {
  const { root } = await fixture(t, { mode: 'quiz' });
  const result = cli(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Quiz 完整性：尚未支援/);
  assert.match(result.stdout, /沒有開放單元/);
  assert.doesNotMatch(result.stdout, /作業已準備完成。\n結果/);
});

test('video-only publication validates all open lectures in source order without any assignment file', async (t) => {
  const { root, put } = await fixture(t, { open: ['S01', 'S02'] });
  await put('course-videos/S01.json', lesson());
  await put('course-videos/S02.json', lesson('S02', [1]));
  await put('assignments/S01.json', 'INVALID QUIZ MUST NOT BE NEEDED');
  const report = await validateContent({ root });
  assert.equal(report.ok, true);
  assert.equal(report.releaseReady, true);
  assert.equal(report.quizCompleteness, 'not-required');
  assert.deepEqual(
    report.lectures[0].videos.map((v) => v.title),
    ['影片 4', '影片 1', '影片 3', '影片 2'],
  );
  const result = cli(root);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Video-only 不需要題庫/);
  assert.ok(result.stdout.indexOf('影片 4') < result.stdout.indexOf('影片 1'));
});

test('published Quiz remains blocked even when its Lecture and a purported quiz file exist', async (t) => {
  const { root, put } = await fixture(t, { mode: 'quiz', open: ['S01'] });
  await put('course-videos/S01.json', lesson());
  await put('assignments/S01.json', { questions: [], fake: 'not verified' });
  const report = await validateContent({ root });
  assert.equal(report.ok, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.lectures.length, 1);
  const result = cli(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Phase 4/);
  assert.match(result.stdout, /正式 Quiz 發布檢查未通過/);
});

test('a locked candidate may validate its Lecture but cannot change the manifest or claim publishing readiness', async (t) => {
  const { root, put } = await fixture(t, { mode: 'quiz' });
  await put('course-videos/S04.json', lesson('S04'));
  const before = await readFile(join(root, 'assignments/manifest.json'), 'utf8');
  const report = await validateContent({ root, unitId: 'S04' });
  assert.equal(report.ok, true);
  assert.equal(report.releaseReady, false);
  assert.equal(report.scope, 'candidate');
  const result = cli(root, '--unit', 'S04');
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /候選 Lecture/);
  assert.match(result.stdout, /不代表作業或正式發布就緒/);
  assert.equal(await readFile(join(root, 'assignments/manifest.json'), 'utf8'), before);
});

test('candidate and publication checks reject empty arrays, missing files, malformed JSON, mismatches and unsafe links', async (t) => {
  const { root, put } = await fixture(t, { open: ['S01'] });
  let result = cli(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /course-videos\/S01.json.*找不到檔案/);
  for (const [value, pattern] of [
    [lesson('S01', []), /尚無課程影片/],
    ['{', /JSON 格式無效/],
    [lesson('S02'), /單元編號不符/],
    [{ ...lesson(), videos: [{ title: 'x', url: 'javascript:alert(1)' }] }, /HTTPS YouTube/],
  ]) {
    await put('course-videos/S01.json', value);
    result = cli(root);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, pattern);
    assert.equal(cli(root, '--unit', 'S01').status, 1);
  }
});

test('candidate validation uses exact S01–S15 and the configured range, not arbitrary paths', async (t) => {
  const { root, put } = await fixture(t, { count: 15 });
  await put('course-videos/S15.json', lesson('S15'));
  assert.equal(cli(root, '--unit', 'S15').status, 0);
  await put('course-config.json', {
    courseTitle: 'x',
    totalUnits: 12,
    assignmentMode: 'video-only',
  });
  assert.equal(cli(root, '--unit', 'S15').status, 1);
  for (const id of ['../S01', 'S01.json', 'S16', 'S1', 's01']) {
    const result = cli(root, '--unit', id);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /S01–S15/);
  }
});

test('invalid course and manifest are rejected before accepting any candidate', async (t) => {
  const { root, put } = await fixture(t);
  await put('course-videos/S01.json', lesson());
  await put('assignments/manifest.json', {
    schemaVersion: 1,
    units: [{ ...item('S01'), file: '../../secret.json' }],
  });
  assert.equal(cli(root, '--unit', 'S01').status, 1);
  await put('course-config.json', {
    courseTitle: 'x',
    totalUnits: 16,
    assignmentMode: 'video-only',
  });
  assert.equal(cli(root).status, 1);
  await put('course-config.json', '{');
  assert.match(cli(root).stdout, /course-config.json.*JSON/);
});

test('validator is read-only for every content file and leaves array order untouched', async (t) => {
  const { root, put } = await fixture(t, { open: ['S01'] });
  await put('course-videos/S01.json', lesson());
  const paths = await readdir(root, { recursive: true, withFileTypes: true });
  const files = paths.filter((p) => p.isFile()).map((p) => join(p.parentPath, p.name));
  const before = await Promise.all(files.map((p) => readFile(p, 'utf8')));
  assert.equal(cli(root).status, 0);
  assert.equal(cli(root, '--unit', 'S01').status, 0);
  assert.deepEqual(await Promise.all(files.map((p) => readFile(p, 'utf8'))), before);
  assert.equal((await readdir(root, { recursive: true })).length, paths.length);
});

test('argument errors fail and help exits without reading content', () => {
  for (const args of [
    ['--unknown'],
    ['--unit'],
    ['--root'],
    ['--unit', 'S01', '--unit', 'S02'],
    ['--root', 'x', '--root', 'y'],
  ])
    assert.throws(() => parseArguments(args));
  const result = spawnSync(process.execPath, [script, '--help', '--root', '/does-not-exist'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /用法/);
  assert.match(
    formatReport({
      ok: false,
      scope: 'published',
      course: null,
      quizCompleteness: 'unsupported',
      lectures: [],
      errors: ['明確錯誤'],
      warnings: [],
    }),
    /明確錯誤/,
  );
});
