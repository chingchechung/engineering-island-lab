import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// Test-only observer: the application exposes this snapshot only in Vite DEV.
// Keep this out of public/; production RC checks use the real DOM/network instead.
export async function checkPhase5Quality(parent, base, pass) {
  await parent.goto('about:blank');
  const browser = parent.context().browser();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);
  const errors = [],
    external = [],
    samples = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin)
      external.push(request.url());
  });
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const settle = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.003 &&
        Math.abs(s.azimuth - s.azimuthGoal) < 0.002 &&
        Math.abs(s.elevation - s.elevationGoal) < 0.002 &&
        s.target.every((value, i) => Math.abs(value - s.goalTarget[i]) < 0.005)
      );
    });
  await mkdir('test-results', { recursive: true });
  try {
    for (const profile of [
      { name: '12-quiz-day', units: 12, night: false, mode: 'quiz' },
      { name: '12-quiz-night', units: 12, night: true, mode: 'quiz' },
      { name: '15-quiz-day', units: 15, night: false, mode: 'quiz' },
      { name: '15-quiz-night', units: 15, night: true, mode: 'quiz' },
      { name: '15-quiz-focus', units: 15, night: false, mode: 'quiz', focus: 'S02' },
      { name: '15-video-only-day', units: 15, night: false, mode: 'video-only' },
    ]) {
      const query = new URLSearchParams({
        demo: '1',
        units: String(profile.units),
        open: String(profile.units),
        questions: '5',
        mode: profile.mode,
      });
      await page.goto(`${base}/?${query}`);
      await page.waitForFunction(() => window.__islandLab);
      if (profile.focus) await page.selectOption('#unit-navigation', profile.focus);
      await settle();
      if (profile.night) {
        await page.locator('#day-night').click();
        await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
      }
      const before = await state();
      assert.equal(before.totalUnits, profile.units);
      assert.equal(before.mode, profile.mode);
      assert.equal(before.open.length, profile.units);
      assert.equal(before.gates.length, 0);
      assert.equal(before.animals.length, profile.units * 3);
      assert.equal(before.sea.whales.length, 4);
      assert.equal(before.pickableAnimals, 0);
      assert.equal(before.pickableBackground, 0);
      assert.equal(before.npcCount, profile.mode === 'quiz' ? profile.units * 5 : 0);
      assert.equal(before.lighting.blend, profile.night ? 1 : 0);
      assert.equal(before.view, profile.focus ?? 'overview');
      if (profile.mode === 'video-only')
        assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);

      const measured = await page.evaluate(async () => {
        // Warm up after navigation / lighting / camera changes. Use timestamps from
        // the same RAF clock and exclude the first interval from the measurement.
        for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
        const timestamps = [];
        for (let i = 0; i < 21; i++) timestamps.push(await new Promise(requestAnimationFrame));
        const frameMs = timestamps.slice(1).map((time, i) => time - timestamps[i]);
        const sorted = [...frameMs].sort((a, b) => a - b);
        const durationMs = timestamps.at(-1) - timestamps[0];
        const s = window.__islandLab.snapshot();
        const gl = document.querySelector('canvas').getContext('webgl2');
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        return {
          frameCount: frameMs.length,
          durationMs,
          frameMs,
          fps: (frameMs.length * 1000) / durationMs,
          medianFrameMs: (sorted[9] + sorted[10]) / 2,
          p95FrameMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
          drawCalls: s.drawCalls,
          triangles: s.triangles,
          geometries: s.geometries,
          textures: s.textures,
          renderer,
          rendererClassification: /SwiftShader|llvmpipe|software/i.test(renderer)
            ? 'software'
            : 'unclassified-see-renderer',
          viewport: [innerWidth, innerHeight],
          dpr: devicePixelRatio,
          mode: s.mode,
          totalUnits: s.totalUnits,
          openUnits: s.open.length,
          view: s.view,
          night: s.lighting.blend === 1,
          npcCount: s.npcCount,
          fauna: s.animals.length,
          whales: s.sea.whales.length,
          visitors: s.visitors.length,
          questionCountPerOpenUnit: s.mode === 'quiz' ? 5 : 0,
        };
      });
      assert.equal(measured.frameCount, 20);
      assert.equal(measured.dpr, 1);
      assert.ok(Number.isFinite(measured.fps) && measured.fps > 0);
      assert.ok(measured.drawCalls > 0 && measured.triangles > 0);
      const after = await state();
      assert.ok(after.time > before.time);
      assert.notDeepEqual(
        after.sea.whales.map((w) => w.position),
        before.sea.whales.map((w) => w.position),
      );
      const screenshot = `test-results/phase5-${profile.name}.png`;
      await page.screenshot({ path: screenshot });
      samples.push({ name: profile.name, screenshot, ...measured });
      console.log(`PHASE5_METRIC ${JSON.stringify(samples.at(-1))}`);
      pass(
        `Phase5 ${profile.name}: twenty RAF intervals, renderer, resource counts and live scenery recorded`,
      );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'performance sampling makes no provider or tracking request');
    await writeFile(
      'test-results/phase5-quality.json',
      JSON.stringify(
        {
          browser: browser.version(),
          source: 'vite-dev-explicit-synthetic-demo',
          methodology:
            '1366x768 DPR1; all open; five questions per unit; three warm-up RAFs then twenty intervals; one active world',
          limitation:
            'Short cloud software-renderer samples are not Windows hardware-GPU or school-Apache acceptance. No FPS pass threshold is inferred.',
          samples,
          errors,
          external,
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await context.close();
  }
}
