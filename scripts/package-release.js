import { createHash, randomUUID } from 'node:crypto';
import { lstat, realpath, readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, basename, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { checkRelease } from './check-release.js';

const DEFAULT_NAME = 'engineering-island-lab-v1.0.0-rc';
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

async function futureRealpath(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(await futureRealpath(dirname(path)), basename(path));
  }
}

function safeEntry(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !/^[./\\]/.test(path) &&
    !/[\\:\x00-\x1f\x7f]/.test(path) &&
    path.split('/').every((part) => part && part !== '.' && part !== '..') &&
    Buffer.byteLength(path, 'utf8') <= 65535
  );
}

function zip(files) {
  if (files.length > 65535) throw new Error('Too many files for a standard ZIP');
  const local = [],
    central = [];
  let offset = 0,
    centralBytes = 0;
  for (const { path, bytes } of files) {
    const name = Buffer.from(path, 'utf8'),
      compressed = deflateRawSync(bytes, { level: 9 });
    const checksum = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names; no platform-specific local path.
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12); // Fixed 1980-01-01, reproducible across OS/timezones.
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(0x0314, 4); // Unix regular-file mode recorded for all platforms.
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x0800, 8);
    record.writeUInt16LE(8, 10);
    record.writeUInt16LE(33, 14);
    record.writeUInt32LE(checksum, 16);
    record.writeUInt32LE(compressed.length, 20);
    record.writeUInt32LE(bytes.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(0x81a40000, 38); // 0100644, no executable bits.
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + compressed.length;
    centralBytes += record.length + name.length;
    if (offset + centralBytes > MAX_ARCHIVE_BYTES)
      throw new Error('Candidate exceeds ZIP size limit');
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBytes, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

/** Prepare a local RC only. This never deploys, tags, publishes, or changes source JSON. */
export async function packageRelease({
  root = 'dist',
  outDir = 'release-candidate',
  name = DEFAULT_NAME,
} = {}) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || name.length > 120)
    throw new Error('Candidate name must be a safe basename');
  const directory = await realpath(resolve(root));
  const output = await futureRealpath(resolve(outDir));
  if (inside(directory, output))
    throw new Error('Output directory must be outside the static root');
  const check = await checkRelease({ root: directory });
  if (!check.ok)
    throw new Error(`Release check failed (${check.issues.length} issue(s)); no candidate written`);
  const files = [...check.files].sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (!files.length || new Set(files.map((f) => f.path)).size !== files.length)
    throw new Error('Release inventory must contain unique files');
  const entries = [];
  let uncompressedBytes = 0;
  for (const file of files) {
    if (!safeEntry(file.path)) throw new Error('Unsafe archive entry');
    const filename = join(directory, ...file.path.split('/'));
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || !inside(directory, await realpath(filename)))
      throw new Error('Release file is no longer a regular file within the static root');
    if (info.size > MAX_FILE_BYTES) throw new Error('Release file exceeds size limit');
    const bytes = await readFile(filename);
    if (bytes.length !== file.bytes || digest(bytes) !== file.sha256)
      throw new Error('Release files changed after validation; rebuild and retry');
    uncompressedBytes += bytes.length;
    if (uncompressedBytes > MAX_ARCHIVE_BYTES)
      throw new Error('Candidate exceeds uncompressed size limit');
    entries.push({ path: file.path, bytes });
  }
  const archive = zip(entries),
    sha256 = digest(archive);
  const archiveName = `${name}.zip`;
  const inventory = {
    schemaVersion: 1,
    archive: archiveName,
    sha256,
    bytes: archive.length,
    uncompressedBytes,
    files,
  };
  const receipt = {
    schemaVersion: 1,
    kind: 'release-candidate-only',
    archive: archiveName,
    sha256,
    bytes: archive.length,
    uncompressedBytes,
    fileCount: files.length,
    course: check.course,
    manifest: check.manifest,
    scan: { ok: check.ok, issues: check.issues, warnings: check.warnings },
    content: {
      ok: check.content?.ok,
      scope: check.content?.scope,
      releaseReady: check.content?.releaseReady,
      quizCompleteness: check.content?.quizCompleteness,
    },
    deployment: 'Not deployed. Teacher approval and server acceptance are separate steps.',
  };
  await mkdir(output, { recursive: true });
  const archivePath = join(output, archiveName);
  const sha256Path = join(output, `${name}.sha256`);
  const inventoryPath = join(output, `${name}.files.json`);
  const reportPath = join(output, `${name}.report.json`);
  const pending = [];
  try {
    // Publish the ZIP last so a partial write cannot masquerade as a complete new RC.
    for (const [destination, data] of [
      [inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`],
      [reportPath, `${JSON.stringify(receipt, null, 2)}\n`],
      [sha256Path, `${sha256}  ${archiveName}\n`],
      [archivePath, archive],
    ]) {
      const temporary = `${destination}.${randomUUID()}.tmp`;
      pending.push(temporary);
      await writeFile(temporary, data, { flag: 'wx' });
      await rename(temporary, destination);
    }
  } finally {
    await Promise.all(pending.map((path) => rm(path, { force: true })));
  }
  return {
    archivePath,
    sha256Path,
    inventoryPath,
    reportPath,
    sha256,
    bytes: archive.length,
    files,
  };
}

export async function main(args = process.argv.slice(2), output = console) {
  const options = {},
    seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help' || flag === '-h') {
      output.log('用法：node scripts/package-release.js [--root dist] [--out release-candidate]');
      return 0;
    }
    if (
      !['--root', '--out'].includes(flag) ||
      seen.has(flag) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    ) {
      output.error('Invalid package arguments; use --help');
      return 2;
    }
    seen.add(flag);
    options[flag === '--root' ? 'root' : 'outDir'] = args[++i];
  }
  try {
    const result = await packageRelease(options);
    output.log(
      `Release candidate prepared: ${basename(result.archivePath)} (${result.bytes} bytes)`,
    );
    output.log(`SHA256 ${result.sha256}`);
    output.log(
      'ZIP inventory and scan receipt are stored beside the archive. No deployment or publication performed.',
    );
    return 0;
  } catch (error) {
    output.error(error.message);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  process.exitCode = await main();
