import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Same browser, DPR, viewport, fixture and 30 RAF intervals for both revisions.
// Optional root permits an immutable main checkout to be measured with this harness.
const baseline = process.argv.includes('--baseline');
const rootArgument = process.argv.find((arg) => arg.startsWith('--root='));
const root = rootArgument ? resolve(rootArgument.slice(7)) : process.cwd();
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0, open: false } });
await server.listen();
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const samples = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  for (const mode of ['quiz', 'video-only']) {
    for (const units of [12, 15]) {
      await page.goto(`${base}/?demo=1&units=${units}&open=6&questions=5&mode=${mode}`);
      await page.waitForFunction(() => window.__islandLab);
      for (const lighting of baseline ? ['day'] : ['day', 'night']) {
        if (lighting === 'night') {
          await page.locator('#day-night').click();
          await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
        }
        for (const view of units === 12 && mode === 'quiz'
          ? ['overview', 'S01', 'S05', 'orbit']
          : ['overview']) {
          if (view === 'orbit' && baseline) continue;
          await page.selectOption('#unit-navigation', view === 'orbit' ? 'overview' : view);
          await page.waitForFunction(() => {
            const s = window.__islandLab.snapshot();
            return (
              Math.abs(s.zoom - s.goalZoom) < 0.001 &&
              s.target.every((v, i) => Math.abs(v - s.goalTarget[i]) < 0.002)
            );
          });
          await page.waitForTimeout(1200);
          const canvas = await page.locator('canvas').boundingBox();
          if (view === 'orbit') {
            await page.mouse.move(canvas.x + canvas.width * 0.9, canvas.y + canvas.height * 0.9);
            await page.mouse.down();
          }
          const data = await page.evaluate(
            async ({ orbit }) => {
              const times = [],
                calls = [],
                triangles = [];
              const canvas = document.querySelector('canvas');
              const rect = canvas.getBoundingClientRect();
              const x = rect.left + rect.width * 0.9,
                y = rect.top + rect.height * 0.9;
              await new Promise((done) => {
                function tick(t) {
                  times.push(t);
                  const state = window.__islandLab.snapshot();
                  calls.push(state.drawCalls);
                  triangles.push(state.triangles);
                  if (orbit)
                    canvas.dispatchEvent(
                      new PointerEvent('pointermove', {
                        pointerId: 1,
                        buttons: 1,
                        clientX: x - times.length * 10,
                        clientY: y,
                        bubbles: true,
                      }),
                    );
                  if (times.length === 31) done();
                  else requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
              });
              const state = window.__islandLab.snapshot(),
                gl = canvas.getContext('webgl2'),
                debug = gl.getExtension('WEBGL_debug_renderer_info');
              return {
                fps: 30000 / (times.at(-1) - times[0]),
                drawCalls: Math.max(...calls),
                triangles: Math.max(...triangles),
                renderer: debug
                  ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                  : gl.getParameter(gl.RENDERER),
                viewport: [innerWidth, innerHeight],
                dpr: devicePixelRatio,
                npcCount: state.npcCount,
                fauna: state.animals.length,
                whales: state.sea.whales.length,
                visitors: state.visitors.length,
                geometries: state.geometries,
                textures: state.textures,
                azimuth: state.azimuth,
                elevation: state.elevation,
              };
            },
            { orbit: view === 'orbit' },
          );
          if (view === 'orbit') await page.mouse.up();
          samples.push({
            phase: baseline ? '2' : '2.5',
            mode,
            units,
            open: 6,
            questions: 5,
            lighting,
            view,
            ...data,
          });
          console.log(JSON.stringify(samples.at(-1)));
        }
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await mkdir('test-results', { recursive: true });
  await writeFile(
    `test-results/phase25-${baseline ? 'baseline' : 'performance'}.json`,
    JSON.stringify({ browser: browser.version(), samples }, null, 2) + '\n',
  );
} finally {
  await browser.close();
  await server.close();
}
