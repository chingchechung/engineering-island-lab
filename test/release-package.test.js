import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
  utimes,
  chmod,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateRawSync, crc32 } from 'node:zlib';
import { packageRelease, main } from '../scripts/package-release.js';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function fixture(run) {
  const temporary = await mkdtemp(join(tmpdir(), 'island-package-'));
  const root = join(temporary, 'site'),
    outDir = join(temporary, 'output');
  try {
    await mkdir(join(root, 'assets'), { recursive: true });
    await mkdir(join(root, 'assignments'));
    const files = {
      'index.html':
        '<!doctype html><html><head><link rel="icon" href="./favicon.svg"><link rel="stylesheet" href="./assets/index-abcdefgh.css"></head><body><script type="module" src="./assets/index-abcdefgh.js"></script></body></html>',
      'assets/index-abcdefgh.js': 'console.log("Release candidate");',
      'assets/index-abcdefgh.css': 'body { color: navy; }',
      'favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
      'course-config.json': JSON.stringify({
        courseTitle: '數位電子學',
        totalUnits: 12,
        assignmentMode: 'quiz',
      }),
      'assignments/manifest.json': JSON.stringify({ schemaVersion: 1, units: [] }),
      'THIRD_PARTY_NOTICES.txt': 'Independent test-only license notice.\n',
    };
    for (const [name, text] of Object.entries(files)) await writeFile(join(root, name), text);
    await run({ root, outDir, temporary, files });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

// Independent reader validates ZIP fields, DEFLATE, file names and CRC32.
function unzip(bytes) {
  const files = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 6), 0x0800);
    assert.equal(bytes.readUInt16LE(offset + 8), 8);
    const size = bytes.readUInt32LE(offset + 18),
      length = bytes.readUInt16LE(offset + 26);
    const name = bytes.subarray(offset + 30, offset + 30 + length).toString('utf8');
    const start = offset + 30 + length;
    const body = inflateRawSync(bytes.subarray(start, start + size));
    assert.equal(crc32(body), bytes.readUInt32LE(offset + 14));
    assert.equal(body.length, bytes.readUInt32LE(offset + 22));
    assert.ok(!files.has(name));
    files.set(name, body);
    offset = start + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'central directory follows local entries');
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length - 12), files.size);
  return files;
}

test('RC ZIP is root-ready and digest/inventory/scan receipts agree with independently inflated files', async () => {
  await fixture(async ({ root, outDir, files }) => {
    const result = await packageRelease({ root, outDir });
    const archive = await readFile(result.archivePath),
      contents = unzip(archive);
    assert.equal(result.bytes, archive.length);
    assert.equal(result.sha256, digest(archive));
    assert.deepEqual([...contents.keys()].sort(), Object.keys(files).sort());
    assert.ok(contents.has('index.html'));
    assert.ok(
      ![...contents.keys()].some(
        (name) => name.startsWith('dist/') || /(?:report|files)\.json$/.test(name),
      ),
    );
    const inventory = JSON.parse(await readFile(result.inventoryPath, 'utf8'));
    assert.equal(inventory.sha256, result.sha256);
    assert.equal(inventory.bytes, archive.length);
    for (const file of inventory.files) {
      assert.equal(file.bytes, contents.get(file.path).length);
      assert.equal(file.sha256, digest(contents.get(file.path)));
      assert.deepEqual(contents.get(file.path), await readFile(join(root, file.path)));
    }
    assert.equal(
      await readFile(result.sha256Path, 'utf8'),
      `${result.sha256}  engineering-island-lab-v1.0.0-rc.zip\n`,
    );
    const receipt = JSON.parse(await readFile(result.reportPath, 'utf8'));
    assert.equal(receipt.kind, 'release-candidate-only');
    assert.equal(receipt.scan.ok, true);
    assert.deepEqual(receipt.course, {
      courseTitle: '數位電子學',
      totalUnits: 12,
      assignmentMode: 'quiz',
    });
    assert.deepEqual(receipt.manifest, { schemaVersion: 1, units: [] });
    assert.equal(receipt.content.releaseReady, false);
    assert.ok(!JSON.stringify(receipt).includes(root));
  });
});

test('RC archive bytes are reproducible across source metadata and output locations', async () => {
  await fixture(async ({ root, outDir, temporary }) => {
    const first = await packageRelease({ root, outDir });
    await utimes(join(root, 'index.html'), new Date('2020-01-01'), new Date('2024-05-01'));
    await chmod(join(root, 'index.html'), 0o755);
    const second = await packageRelease({ root, outDir: join(temporary, 'another-output') });
    assert.equal(first.sha256, second.sha256);
    assert.deepEqual(await readFile(first.archivePath), await readFile(second.archivePath));
  });
});

test('RC refuses invalid/private build contents before producing output and leaves source untouched', async () => {
  await fixture(async ({ root, outDir }) => {
    const before = await readFile(join(root, 'course-config.json'));
    await writeFile(join(root, '.env'), 'PRIVATE_TEST_PLACEHOLDER=not-a-real-secret');
    await assert.rejects(packageRelease({ root, outDir }), /Release check failed/);
    await assert.rejects(access(outDir), { code: 'ENOENT' });
    assert.deepEqual(await readFile(join(root, 'course-config.json')), before);
  });
});

test('RC rejects unsafe names and output directories inside the deployment root', async () => {
  await fixture(async ({ root, outDir }) => {
    for (const name of ['../escape', '/absolute', 'a\\b', '.', '', 'a/b', 'a\n'])
      await assert.rejects(packageRelease({ root, outDir, name }), /safe basename/);
    await assert.rejects(packageRelease({ root, outDir: root }), /outside/);
    await assert.rejects(packageRelease({ root, outDir: join(root, 'candidate') }), /outside/);
  });
});

test('RC rejects symlink payloads and output aliases into the deployment root', async (t) => {
  await fixture(async ({ root, outDir, temporary }) => {
    try {
      await symlink(root, join(temporary, 'alias'), 'junction');
    } catch (error) {
      if (['EPERM', 'EACCES'].includes(error.code)) {
        t.diagnostic(
          'Symlink creation unavailable on this account; direct containment tests still cover output safety.',
        );
        return;
      }
      throw error;
    }
    await assert.rejects(
      packageRelease({ root, outDir: join(temporary, 'alias', 'output') }),
      /outside/,
    );
    try {
      await symlink(join(root, 'course-config.json'), join(root, 'linked.json'));
    } catch (error) {
      if (['EPERM', 'EACCES'].includes(error.code)) {
        t.diagnostic(
          'File symlink creation needs Windows Developer Mode; junction containment check passed.',
        );
        return;
      }
      throw error;
    }
    await assert.rejects(packageRelease({ root, outDir }), /Release check failed/);
    await assert.rejects(access(outDir), { code: 'ENOENT' });
  });
});

test('RC CLI rejects invalid/repeated arguments without doing a build or publish', async () => {
  const output = { log() {}, error() {} };
  for (const args of [['--out'], ['--publish'], ['--root', 'dist', '--root', 'dist']])
    assert.equal(await main(args, output), 2);
  assert.equal(await main(['--help'], output), 0);
});
