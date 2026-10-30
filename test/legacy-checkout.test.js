import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const referencePath = 'test/fixtures/legacy/reference/';
const ported = ['assignment-rules.js', 'assignment-validator.js'].map(
  (name) => `src/legacy-assignment/${name}`,
);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

test(
  'autocrlf=true preserves all 14 pinned hashes in fresh and refreshed checkouts',
  { timeout: 60_000 },
  (t) => {
    const temporary = mkdtempSync(join(tmpdir(), 'island-eol-'));
    t.after(() => rmSync(temporary, { recursive: true, force: true }));
    const seed = join(temporary, 'source');
    const existing = join(temporary, 'existing');
    const fresh = join(temporary, 'fresh');
    const hooks = join(temporary, 'empty-hooks');
    const attributes = join(temporary, 'empty-attributes');
    mkdirSync(hooks);
    writeFileSync(attributes, '');
    const inventory = JSON.parse(
      readFileSync(join(project, 'test/fixtures/legacy/source-files.json'), 'utf8'),
    );
    assert.equal(inventory.files.length, 14);
    const pinned = inventory.files.map((entry) => referencePath + entry.file);
    const paths = [...pinned, ...ported];
    const git = (cwd, ...args) =>
      execFileSync('git', ['-c', `core.attributesFile=${attributes}`, '-C', cwd, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    const put = (directory, name, bytes) => {
      const path = join(directory, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
    };
    const commit = (message) =>
      git(
        seed,
        '-c',
        'user.name=Checkout Regression',
        '-c',
        'user.email=checkout@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        `core.hooksPath=${hooks}`,
        'commit',
        '--quiet',
        '-m',
        message,
      );
    const clone = (target) =>
      execFileSync(
        'git',
        [
          'clone',
          '--quiet',
          '--no-local',
          '--config',
          'core.autocrlf=true',
          '--config',
          'core.safecrlf=false',
          '--config',
          `core.attributesFile=${attributes}`,
          '--config',
          `core.hooksPath=${hooks}`,
          '--config',
          'commit.gpgsign=false',
          seed,
          target,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    const verify = (directory) => {
      assert.equal(git(directory, 'config', '--get', 'core.autocrlf'), 'true');
      for (const entry of inventory.files)
        assert.equal(
          digest(readFileSync(join(directory, referencePath, entry.file))),
          entry.sha256,
          entry.file,
        );
      for (const name of ported) {
        const bytes = readFileSync(join(directory, name));
        assert.equal(bytes.includes(Buffer.from('\r\n')), false, `${name} must use LF`);
        assert.deepEqual(bytes, readFileSync(join(project, name)), `${name} content is unchanged`);
      }
      // Prove that conversion remains enabled outside the narrowly scoped rules.
      assert.deepEqual(
        readFileSync(join(directory, 'control.txt')),
        Buffer.from('ordinary text\r\n'),
      );
    };

    mkdirSync(seed);
    git(seed, 'init', '--quiet');
    git(seed, 'config', 'core.autocrlf', 'false');
    git(seed, 'config', 'core.safecrlf', 'false');
    for (const name of paths) put(seed, name, readFileSync(join(project, name)));
    put(seed, 'control.txt', 'ordinary text\n');
    git(seed, 'add', '--all');
    commit('Original LF blobs before attributes');
    clone(existing);
    assert.equal(
      digest(readFileSync(join(existing, referencePath, 'js/assignment-rules.js'))),
      '792d7191229f198305c259c526e29d3ae3be744e29e0db0054651be295ae05b2',
      'reproduce the instructor-reported Windows CRLF bytes',
    );

    // Preserve a learner/developer's unrelated work before updating the branch.
    put(existing, 'control.txt', 'personal edit\r\n');
    put(existing, 'personal-notes.txt', 'keep these notes\n');
    git(
      existing,
      '-c',
      'user.name=Checkout Regression',
      '-c',
      'user.email=checkout@example.invalid',
      'stash',
      'push',
      '--include-untracked',
      '-m',
      'Before EOL checkout fix',
    );
    put(seed, '.gitattributes', readFileSync(join(project, '.gitattributes')));
    git(seed, 'add', '.gitattributes');
    commit('Add checkout attributes without changing original blobs');

    clone(fresh);
    verify(fresh);
    git(existing, 'fetch', '--quiet', 'origin');
    git(existing, 'merge', '--quiet', '--ff-only', 'FETCH_HEAD');
    // Updating .gitattributes alone does not rematerialize existing CRLF files.
    assert.equal(
      digest(readFileSync(join(existing, referencePath, 'js/assignment-rules.js'))),
      '792d7191229f198305c259c526e29d3ae3be744e29e0db0054651be295ae05b2',
    );
    for (const name of paths) rmSync(join(existing, name));
    git(existing, 'restore', '--source=HEAD', '--staged', '--worktree', '--', ...paths);
    verify(existing);
    assert.equal(git(existing, 'status', '--porcelain'), '');
    assert.equal(git(existing, 'show', 'stash@{0}:control.txt'), 'personal edit');
    assert.equal(git(existing, 'show', 'stash@{0}^3:personal-notes.txt'), 'keep these notes');
    for (const entry of inventory.files)
      t.diagnostic(`autocrlf=true fresh + refreshed SHA256 ${entry.file}: ${entry.sha256}`);
  },
);
