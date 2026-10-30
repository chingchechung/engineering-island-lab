import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startDeploymentServer, parseDeploymentArguments } from '../scripts/deployment-server.js';

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'island-deployment-'));
  let server;
  try {
    await mkdir(join(root, 'assets'));
    for (const [path, text] of Object.entries({
      'index.html': '<!doctype html><title>Static fixture</title>',
      'assets/index-abcdefgh.js': 'export const value = 1;',
      'assets/index-abcdefgh.css': 'body { color: navy; }',
      'course-config.json': '{"version":1}',
      'favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    }))
      await writeFile(join(root, path), text);
    server = await startDeploymentServer({ root, mountPath: '/~teacher/island/' });
    await run(root, server, (path = '') => new URL(path, server.baseUrl));
  } finally {
    if (server) await server.close();
    await rm(root, { recursive: true, force: true });
  }
}

test('deployment simulation serves subdirectory entry, trailing slash, HEAD and correct MIME', async () => {
  await fixture(async (_root, server, url) => {
    assert.equal(server.kind, 'node-http-simulation');
    assert.equal(new URL(server.baseUrl).hostname, '127.0.0.1');
    const redirect = await fetch(server.baseUrl.slice(0, -1), { redirect: 'manual' });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), '/~teacher/island/');
    for (const [name, mime] of [
      ['', /text\/html/],
      ['index.html', /text\/html/],
      ['assets/index-abcdefgh.js', /javascript/],
      ['assets/index-abcdefgh.css', /text\/css/],
      ['course-config.json', /application\/json/],
      ['favicon.svg', /image\/svg\+xml/],
    ]) {
      const response = await fetch(url(name));
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), mime);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const head = await fetch(url(name), { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.ok(Number(head.headers.get('content-length')) > 0);
      assert.equal(await head.text(), '');
    }
  });
});

test('deployment simulation returns real 404 without HTML fallback or directory listing', async () => {
  await fixture(async (_root, _server, url) => {
    for (const path of ['missing.js', 'missing.json', 'assets/', 'missing-page/', '/index.html']) {
      const response = await fetch(url(path));
      assert.equal(response.status, 404, path);
      assert.equal(await response.text(), 'Not found');
    }
    const response = await fetch(url(), { method: 'POST' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  });
});

test('deployment cache revalidates mutable JSON including same-size replacements and caches hashed assets', async () => {
  await fixture(async (root, _server, url) => {
    const first = await fetch(url('course-config.json'));
    assert.equal(first.headers.get('cache-control'), 'no-cache');
    const etag = first.headers.get('etag');
    assert.ok(etag);
    const unchanged = await fetch(url('course-config.json'), {
      headers: { 'if-none-match': etag },
    });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), '');
    await writeFile(join(root, 'course-config.json'), '{"version":2}');
    const changed = await fetch(url('course-config.json'), { headers: { 'if-none-match': etag } });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get('etag'), etag);
    assert.deepEqual(await changed.json(), { version: 2 });
    const page = await fetch(url());
    assert.equal(page.headers.get('cache-control'), 'no-cache');
    const asset = await fetch(url('assets/index-abcdefgh.js'));
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });
});

test('deployment simulation confines decoded paths and symlinks to static root', async (t) => {
  await fixture(async (root, _server, url) => {
    const outside = await mkdtemp(join(tmpdir(), 'island-outside-'));
    try {
      await writeFile(join(outside, 'private.txt'), 'must not escape');
      for (const name of [
        '%2e%2e/private.txt',
        '%2e%2e%2fprivate.txt',
        '%5c..%5cprivate.txt',
        '%00',
        '%ZZ',
      ]) {
        const response = await fetch(url(name));
        assert.ok([400, 404].includes(response.status), name);
        assert.doesNotMatch(await response.text(), /must not escape/);
      }
      try {
        await symlink(outside, join(root, 'outside'), 'junction');
      } catch (error) {
        if (['EPERM', 'EACCES'].includes(error.code)) {
          t.diagnostic(
            'Symlink check unavailable on this Windows account; decoded path checks still ran.',
          );
          return;
        }
        throw error;
      }
      const response = await fetch(url('outside/private.txt'));
      assert.equal(response.status, 404);
      assert.doesNotMatch(await response.text(), /must not escape/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test('deployment simulation rejects malformed mounts before starting a server', async () => {
  for (const mountPath of ['relative/', '/course', '/course/../', '/course/?q=1', '//'])
    await assert.rejects(startDeploymentServer({ root: '.', mountPath }), /mountPath/);
});

test('deployment CLI accepts root/mount and rejects incomplete, repeated or unsupported options', () => {
  assert.deepEqual(parseDeploymentArguments([]), { root: 'dist', mountPath: '/', help: false });
  assert.deepEqual(parseDeploymentArguments(['--root', 'extracted RC', '--mount', '/course/']), {
    root: 'extracted RC',
    mountPath: '/course/',
    help: false,
  });
  assert.equal(parseDeploymentArguments(['--help']).help, true);
  for (const args of [['--root'], ['--port', '8000'], ['--mount', '/', '--mount', '/again/']])
    assert.throws(() => parseDeploymentArguments(args), /Invalid arguments/);
});
