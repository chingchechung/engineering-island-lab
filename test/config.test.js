import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import {
  loadCourseConfig,
  loadManifest,
  validateCourseConfig,
  validateManifest,
  isLocalDemo,
} from '../src/config.js';

const expected = JSON.parse(
  await readFile(new URL('../public/course-config.json', import.meta.url), 'utf8'),
);
const manifest = JSON.parse(
  await readFile(new URL('../public/assignments/manifest.json', import.meta.url), 'utf8'),
);
let server, origin;
before(async () => {
  server = createServer((request, response) => {
    const path = request.url.replace('/~wildwolf/engineering-island-lab', '');
    if (path === '/course-config.json' || path === '/assignments/manifest.json') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(path.includes('manifest') ? manifest : expected));
    } else if (path === '/invalid/course-config.json') {
      response.writeHead(200);
      response.end('{');
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});
for (const path of [
  '/',
  '/~wildwolf/engineering-island-lab/',
  '/~wildwolf/engineering-island-lab/index.html',
]) {
  test(`course and empty manifest remain relative to ${path}`, async () => {
    assert.deepEqual(await loadCourseConfig(`${origin}${path}`), expected);
    assert.deepEqual(await loadManifest(`${origin}${path}`, 12), { schemaVersion: 1, units: [] });
  });
}
test('HTTP and malformed JSON failures are explicit', async () => {
  await assert.rejects(loadCourseConfig(`${origin}/missing/`), /HTTP 404/);
  await assert.rejects(loadCourseConfig(`${origin}/invalid/`), /JSON/);
});
test('course configuration accepts 1, 12, 15 units and both explicit modes', () => {
  for (const totalUnits of [1, 12, 15])
    for (const assignmentMode of ['quiz', 'video-only']) {
      assert.deepEqual(validateCourseConfig({ ...expected, totalUnits, assignmentMode }), {
        ...expected,
        totalUnits,
        assignmentMode,
      });
    }
});
test('course configuration rejects invalid ranges, missing title and implicit modes', () => {
  for (const totalUnits of [0, 16, -1, 1.5, '12', null, NaN])
    assert.throws(() => validateCourseConfig({ ...expected, totalUnits }), /totalUnits/);
  for (const courseTitle of ['', '  ', null, 12])
    assert.throws(() => validateCourseConfig({ ...expected, courseTitle }), /courseTitle/);
  for (const assignmentMode of [undefined, '', 'auto', 'QUIZ'])
    assert.throws(() => validateCourseConfig({ ...expected, assignmentMode }), /assignmentMode/);
});
test('manifest validates unit range, duplicates and exact safe filenames', () => {
  const unit = { unitId: 'S01', title: 'Demo', file: 'S01.json' };
  assert.equal(validateManifest({ schemaVersion: 1, units: [unit] }, 12).units.length, 1);
  for (const invalid of [
    { ...unit, file: '../S01.json' },
    { ...unit, unitId: 'S13', file: 'S13.json' },
    { ...unit, title: '' },
    { ...unit, unitId: 'S16', file: 'S16.json' },
  ]) {
    assert.throws(() => validateManifest({ schemaVersion: 1, units: [invalid] }, 12));
  }
  assert.throws(() => validateManifest({ schemaVersion: 1, units: [unit, unit] }, 12));
  assert.throws(() => validateManifest({ schemaVersion: 2, units: [] }, 12));
  assert.equal(
    validateManifest(
      { schemaVersion: 1, units: [{ unitId: 'S15', title: 'Future', file: 'S15.json' }] },
      15,
    ).units.length,
    1,
  );
});
test('Demo requires explicit opt-in AND a development build', () => {
  assert.equal(isLocalDemo('?demo=1', true), true);
  assert.equal(isLocalDemo('', true), false);
  assert.equal(isLocalDemo('?demo=1', false), false);
  assert.equal(isLocalDemo('?demo=0', true), false);
});
