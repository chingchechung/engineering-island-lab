import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { startDeploymentServer } from './deployment-server.js';
import { startApacheServer } from './apache-test.js';
import { readDemoLecture } from '../src/demo/lecture-fixture.js';

const options = { root: 'dist', apache: false };
const seen = new Set();
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (seen.has(flag)) throw new Error('Duplicate argument');
  seen.add(flag);
  if (flag === '--apache') options.apache = true;
  else if (flag === '--root' && process.argv[i + 1] && !process.argv[i + 1].startsWith('-'))
    options.root = process.argv[++i];
  else throw new Error('Usage: node scripts/release-browser.js [--root dist] [--apache]');
}
const startServer = options.apache ? startApacheServer : startDeploymentServer;
const source = resolve(options.root);
const executablePath =
  process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const errors = [],
  external = [],
  responses = [],
  checks = [];
const stage = await mkdtemp(join(tmpdir(), 'island-rc-browser-'));
let server, context;
await mkdir('test-results', { recursive: true });
const observe = async (baseUrl) => {
  if (context) await context.close();
  context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(baseUrl).origin)
      external.push(request.url());
  });
  page.on('response', (response) =>
    responses.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
      type: response.headers()['content-type'],
      cache: response.headers()['cache-control'],
    }),
  );
  return page;
};
const ready = (page) => page.waitForSelector('#loading[hidden]', { state: 'attached' });
try {
  server = await startServer({ root: source, mountPath: '/teaching/2026/lab/' });
  const kind = server.kind;
  let page = await observe(server.baseUrl);
  await page.goto(server.baseUrl + '?demo=1&units=15&open=15&questions=5&mode=video-only');
  await ready(page);
  assert.equal(await page.locator('#course-title').textContent(), '數位電子學');
  assert.match(await page.locator('#course-summary').textContent(), /12 島.*開放 0/);
  assert.equal(await page.locator('.label-locked').count(), 12);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  assert.equal(await page.evaluate(() => typeof window.__islandLab), 'undefined');
  assert.equal(await page.locator('#unit-navigation option[value^="S"]').count(), 12);
  assert.ok(await page.locator('canvas').isVisible());
  assert.equal(
    responses.filter((r) => /(?:assignments|course-videos)\/S\d{2}\.json/.test(r.path)).length,
    0,
  );
  checks.push(
    'exact production RC: 12 locked, all query overrides ignored, no material requests/debug API',
  );
  for (const width of [1366, 1920, 390]) {
    await page.setViewportSize({
      width,
      height: width === 1920 ? 1080 : width === 390 ? 844 : 768,
    });
    await page.locator('#about').click();
    assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.open), true);
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
      ),
      false,
    );
    await page.screenshot({ path: `test-results/phase5-rc-help-${kind}-${width}.png` });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.reload();
  await ready(page);
  assert.equal(await page.locator('.label-locked').count(), 12);
  await page.screenshot({ path: `test-results/phase5-rc-${kind}.png` });
  checks.push('direct nested entry/reload and 1366/1920/390 help Modal fit');
  assert.deepEqual(JSON.parse(await readFile(join(source, 'assignments/manifest.json'), 'utf8')), {
    schemaVersion: 1,
    units: [],
  });
  await context.close();
  context = null;
  await server.close();
  server = null;

  // Private, disposable deployment fixture, NEVER part of the candidate ZIP.
  // A real browser cache/reload must discover a changed Manifest on the same URL.
  const fixture = join(stage, 'site');
  await cp(source, fixture, { recursive: true });
  await mkdir(join(fixture, 'course-videos'), { recursive: true });
  const lecture = await readDemoLecture('S01');
  await writeFile(join(fixture, 'course-videos/S01.json'), JSON.stringify(lecture));
  await writeFile(
    join(fixture, 'course-config.json'),
    JSON.stringify({
      courseTitle: 'Private RC cache fixture',
      totalUnits: 1,
      assignmentMode: 'video-only',
    }),
  );
  server = await startServer({ root: fixture, mountPath: '/teaching/2026/lab/' });
  const offset = responses.length;
  page = await observe(server.baseUrl);
  await page.goto(server.baseUrl + '?demo=1&mode=quiz&open=15');
  await ready(page);
  assert.equal(await page.locator('.label-locked').count(), 1);
  const manifest = JSON.stringify({
    schemaVersion: 1,
    units: [{ unitId: 'S01', title: 'Private cache test', file: 'S01.json' }],
  });
  if (server.replaceFile) await server.replaceFile('assignments/manifest.json', manifest);
  else await writeFile(join(fixture, 'assignments/manifest.json'), manifest);
  await page.reload();
  await ready(page);
  assert.equal(await page.locator('.label-locked').count(), 0);
  assert.equal(await page.locator('.label-unit').count(), 1);
  await page.selectOption('#unit-navigation', 'S01');
  await page.locator('[data-label="lecture"]').click();
  await page.waitForSelector('.lecture-video-link');
  assert.equal(await page.locator('.lecture-video-link').count(), 1);
  assert.equal(
    await page.locator('.lecture-video-link').getAttribute('href'),
    lecture.videos[0].url,
  );
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  assert.equal(
    responses.slice(offset).filter((r) => /quiz-runtime|assignments\/S\d{2}\.json/.test(r.path))
      .length,
    0,
  );
  await page.screenshot({ path: `test-results/phase5-cache-lecture-${kind}.png` });
  checks.push(
    'same-URL Manifest replacement discovered on reload; video-only Lecture works with zero Quiz chunk/JSON',
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.equal(responses.filter((r) => r.status >= 400).length, 0);
  const report = {
    kind,
    browser: browser.version(),
    source: 'production-static-build',
    checks,
    privateFixture: 'cache/Video-only stage only; synthetic links are not opened or included in RC',
    responses,
    errors,
    external,
    limitation: 'Local validation only; no school server or Windows hardware GPU acceptance.',
  };
  await writeFile(`test-results/phase5-rc-${kind}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`RC browser passed (${kind}): ${checks.join('; ')}`);
} finally {
  if (context) await context.close();
  await browser.close();
  if (server) await server.close();
  await rm(stage, { recursive: true, force: true });
}
