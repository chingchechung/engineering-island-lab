import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Real native-dialog layout without a WebGL scene. No external network is used.
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const markup = index.match(/<dialog\b[\s\S]*?<\/dialog>/)[0];
const fixtureScript = `
import {createDialog} from '/src/ui.js';
import {createLectureController} from '/src/lecture-ui.js';
const dialog=createDialog();
const records={S01:1,S02:4,S03:10,S04:40};
const controller=createLectureController({dialog,demo:true,loader:{load:async unitId=>({
  unitId,title:unitId==='S03'?'十部影片與長標題換行測試':'課程影片清單',
  videos:Array.from({length:records[unitId]},(_,i)=>({
    title:i===records[unitId]-1?'完整長標題：'+('不分語言順序'.repeat(8))+'TOKEN'.repeat(15):'原始順序教學影片 '+(i+1),
    url:'https://youtu.be/DEMO'+String(i+1).padStart(7,'0')+'?t=17'
  }))
})}});
window.__lectureComponent={controller,dialog,open:unitId=>controller.open(unitId,document.querySelector('#launch'))};
`;
const html = `<!doctype html><html lang="zh-Hant"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/lecture.css"></head><body><button id="launch">開啟 Lecture</button>${markup}<script type="module" src="/__lecture-component__/fixture.js"></script></body></html>`;
const server = await createServer({
  plugins: [
    {
      name: 'lecture-component-only',
      configureServer(vite) {
        vite.middlewares.use('/__lecture-component__/', (request, response) => {
          const script = request.url.startsWith('/fixture.js');
          response.setHeader(
            'Content-Type',
            script ? 'application/javascript' : 'text/html; charset=utf-8',
          );
          response.end(script ? fixtureScript : html);
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 0, open: false },
});
await server.listen();
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const metrics = [];
try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  await context.route('https://youtu.be/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Intercepted YouTube test destination</title>',
    }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__lecture-component__/`);
  await page.waitForFunction(() => window.__lectureComponent);
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const [unitId, count] of [
      ['S01', 1],
      ['S02', 4],
      ['S03', 10],
      ['S04', 40],
    ]) {
      await page.evaluate((id) => window.__lectureComponent.open(id), unitId);
      await page.waitForFunction(
        () => window.__lectureComponent.controller.snapshot().status === 'ready',
      );
      assert.equal(await page.locator('.lecture-video-link').count(), count);
      const before = await page.evaluate(() => {
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
            right: r.right,
          };
        };
        const dialog = document.querySelector('dialog'),
          scroll = document.querySelector('.dialog-scroll');
        return {
          dialog: box(dialog),
          close: box(document.querySelector('#close-dialog')),
          title: box(document.querySelector('#dialog-title')),
          font: parseFloat(
            getComputedStyle(document.querySelector('.lecture-video-link')).fontSize,
          ),
          actionFont: parseFloat(
            getComputedStyle(document.querySelector('.lecture-video-action')).fontSize,
          ),
          row: box(document.querySelector('.lecture-video-link')),
          overflow:
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight,
          scrollWidth: scroll.scrollWidth,
          clientWidth: scroll.clientWidth,
          scrollHeight: scroll.scrollHeight,
          clientHeight: scroll.clientHeight,
        };
      });
      assert.equal(before.overflow, false);
      assert.ok(before.dialog.bottom <= height - 11 && before.dialog.y >= 11);
      assert.equal(before.font, width <= 550 ? 16 : 18);
      assert.ok(before.actionFont >= 16);
      assert.ok(
        before.close.width >= 44 &&
          before.close.height >= 44 &&
          before.close.bottom <= before.dialog.bottom,
      );
      assert.ok(before.row.height >= 44);
      assert.ok(before.scrollWidth <= before.clientWidth + 1);
      if (count >= 10) assert.ok(before.scrollHeight > before.clientHeight);
      await page.locator('.dialog-scroll').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const titleAfter = await page.locator('#dialog-title').boundingBox();
      assert.ok(
        Math.abs(titleAfter.y - before.title.y) < 1,
        'title stays fixed while the list scrolls',
      );
      if (unitId === 'S03') {
        const scrollBefore = await page.locator('.dialog-scroll').evaluate((el) => el.scrollTop);
        const popupPromise = page.waitForEvent('popup');
        await page.locator('.lecture-video-link').last().click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        assert.equal(await popup.evaluate(() => window.opener), null);
        await popup.close();
        await page.bringToFront();
        assert.equal(await page.locator('dialog').getAttribute('open'), '');
        assert.equal(
          await page.locator('.dialog-scroll').evaluate((el) => el.scrollTop),
          scrollBefore,
        );
      }
      if (unitId === 'S03')
        await page.screenshot({ path: `test-results/lecture-component-${width}.png` });
      metrics.push({ width, height, unitId, count, ...before });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog').open);
      await page.waitForFunction(() => document.activeElement.id === 'launch');
    }
    console.log(
      `PASS ${width}x${height}: 1/4/10/40 videos, sticky title, contained layout, popup and scroll retention`,
    );
  }
  // The common Modal stress test may replace the otherwise short fixed unit title.
  await page.setViewportSize({ width: 390, height: 320 });
  await page.evaluate(() => window.__lectureComponent.open('S03'));
  await page.locator('#dialog-title').evaluate((el) => {
    el.textContent = '極長視窗標題'.repeat(80);
  });
  await page.locator('.dialog-scroll').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const stress = await page.evaluate(() => {
    const d = document.querySelector('dialog').getBoundingClientRect(),
      c = document.querySelector('#close-dialog').getBoundingClientRect(),
      s = document.querySelector('.dialog-scroll');
    return {
      bottom: d.bottom,
      y: d.y,
      closeBottom: c.bottom,
      scrollTop: s.scrollTop,
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    };
  });
  assert.ok(
    stress.y >= 11 &&
      stress.bottom <= 309 &&
      stress.closeBottom <= stress.bottom &&
      stress.scrollTop > 0 &&
      !stress.overflow,
  );
  await page.evaluate(() => {
    document.querySelector('dialog').close();
    window.__lectureComponent.open('S02');
  });
  await page.waitForFunction(
    () => window.__lectureComponent.controller.snapshot().status === 'ready',
  );
  await page.waitForTimeout(30);
  assert.deepEqual(await page.evaluate(() => window.__lectureComponent.controller.snapshot()), {
    status: 'ready',
    unitId: 'S02',
    videoCount: 4,
  });
  assert.match(await page.locator('#dialog-title').textContent(), /^S02/);
  console.log('PASS same-task native close/reopen preserves the new Lecture session');
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/lecture-component-layout.json',
    JSON.stringify({ metrics, stress }, null, 2) + '\n',
  );
  console.log(
    'PASS 390x320: extreme common-dialog heading remains contained with visible close control',
  );
} finally {
  await browser.close();
  await server.close();
}
