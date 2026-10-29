import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import { loadCourseConfig } from '../src/config.js';

// Mount the unchanged dist/ under an Apache-style user directory.
const mountPath = '/~wildwolf/engineering-island-lab/';
const server = await preview({
  base: mountPath,
  preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
});

try {
  const pageUrl = new URL(mountPath, `http://127.0.0.1:${server.httpServer.address().port}`);
  const response = await fetch(pageUrl);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<script\b[^>]*type="module"/);
  assert.match(html, /rel="stylesheet"/);

  const references = [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)];
  assert.ok(references.length >= 3, 'built HTML must reference JavaScript, CSS, and a favicon');
  for (const [, reference] of references) {
    assert.ok(reference.startsWith('./'), `asset must use a relative path: ${reference}`);
    const resourceUrl = new URL(reference, pageUrl);
    assert.ok(resourceUrl.pathname.startsWith(mountPath));
    const resource = await fetch(resourceUrl);
    assert.equal(resource.status, 200, `built asset must load: ${reference}`);
    const type = resource.headers.get('content-type');
    const expectedType = reference.endsWith('.js')
      ? /javascript/
      : reference.endsWith('.css')
        ? /text\/css/
        : /image\/svg\+xml/;
    assert.match(type, expectedType, 'a missing asset must not pass via an HTML fallback');
    assert.ok((await resource.arrayBuffer()).byteLength > 0);
  }

  const expected = JSON.parse(
    await readFile(new URL('../public/course-config.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(await loadCourseConfig(pageUrl), expected);
  const manifest = await fetch(new URL('./assignments/manifest.json', pageUrl));
  assert.deepEqual(await manifest.json(), { schemaVersion: 1, units: [] });
  console.log(
    'Smoke test passed: built HTML, JavaScript, CSS, favicon, and JSON load under an Apache-style subdirectory.',
  );
} finally {
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
