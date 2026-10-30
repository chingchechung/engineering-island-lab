import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Native dialog, radio controls and real new-tab activation without rendering a
// separate 3D scene. These synthetic records are never served as course data.
const units = [
  ['S01', 1, 4],
  ['S02', 2, 4],
  ['S03', 2, 5],
].map(([unitId, version, count]) => ({
  schemaVersion: version,
  unitId,
  title: `${unitId} 合成題庫（非正式教材）`,
  googleFormUrl: `https://forms.gle/IslandDemo${unitId}?source=component`,
  questions: Array.from({ length: count }, (_, index) => ({
    id: `Q${String(index + 1).padStart(2, '0')}`,
    title: index === 0 ? '原始題目標題 <b>安全文字</b>' : `題目 ${index + 1}`,
    prompt:
      index === 0
        ? '可捲動長題目，保留原始換行。\n'.repeat(12) + 'TOKEN'.repeat(30)
        : `第 ${index + 1} 題：單選一個答案。`,
    questionVideoUrl: `https://youtu.be/DEMO${String(index + 1).padStart(7, '0')}?t=17`,
    explanationVideoUrl: `https://www.youtube.com/watch?v=DEMO${String(index + 6).padStart(7, '0')}`,
    explanationText: index === 0 ? '<img src=x onerror=alert(1)> 原始解說\n第二行說明。' : '',
    options:
      version === 2 && index === 0
        ? ['第一個可接受答案', '錯誤答案', '另一個可接受答案']
        : ['第一個答案', '第二個答案', '第三個答案', '第四個答案'],
    ...(version === 1
      ? { correctOption: 'ABCD'[index % 4] }
      : { correctOptions: index === 0 ? ['A', 'C'] : ['B'] }),
  })),
}));
const markup = (await readFile(new URL('../index.html', import.meta.url), 'utf8')).match(
  /<dialog\b[\s\S]*?<\/dialog>/,
)[0];
const fixtureScript = `
import {createDialog} from '/src/ui.js';
import {createQuizSessions} from '/src/quiz-session.js';
import {createQuizController} from '/src/quiz-ui.js';
const dialog=createDialog(),sessions=createQuizSessions();
${JSON.stringify(units)}.forEach(unit=>sessions.activate(unit));
const progress=[];
const controller=createQuizController({dialog,sessions,demo:true,onProgress:(...args)=>progress.push(args)});
const launch=document.querySelector('#launch');
const open=(unitId,questionId='Q01')=>controller.open(unitId,questionId,launch);
launch.addEventListener('click',()=>open('S01'));
window.__quizComponent={dialog,controller,sessions,progress,open};
`;
const html = `<!doctype html><html lang="zh-Hant"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/style.css"></head><body><button id="launch">開啟 Quiz</button>${markup}<script type="module" src="/__quiz-component__/fixture.js"></script></body></html>`;
const server = await createServer({
  plugins: [
    {
      name: 'quiz-component-only',
      configureServer(vite) {
        vite.middlewares.use('/__quiz-component__/', (request, response) => {
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
const layouts = [],
  actions = [];
try {
  await mkdir('test-results', { recursive: true });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const providerRequests = [];
  await context.route(/^https:\/\/(?:youtu\.be|www\.youtube\.com|forms\.gle)\//, async (route) => {
    providerRequests.push({
      url: route.request().url(),
      referer: route.request().headers().referer ?? null,
    });
    await route.fulfill({
      contentType: 'text/html',
      body: '<title>Intercepted synthetic Quiz destination</title>',
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.httpServer.address().port}/__quiz-component__/`;
  async function popup(selector, keyboard = false) {
    const link = page.locator(selector);
    await link.scrollIntoViewIfNeeded();
    if (keyboard) await link.focus();
    const before = await page.locator('.dialog-scroll').evaluate((node) => node.scrollTop);
    const expected = await link.getAttribute('href');
    const opened = page.waitForEvent('popup');
    if (keyboard) await page.keyboard.press('Enter');
    else await link.click();
    const tab = await opened;
    await tab.waitForLoadState('domcontentloaded');
    assert.equal(tab.url(), expected);
    assert.equal(await tab.evaluate(() => window.opener), null);
    assert.equal(await tab.evaluate(() => document.referrer), '');
    await tab.close();
    await page.bringToFront();
    assert.equal(await page.locator('dialog').evaluate((node) => node.open), true);
    assert.equal(await page.locator('.dialog-scroll').evaluate((node) => node.scrollTop), before);
    actions.push({
      selector,
      keyboard,
      url: expected,
      opener: null,
      retainedDialog: true,
      retainedScroll: true,
    });
  }
  const open = async (unitId, questionId = 'Q01') => {
    await page.evaluate(([id, qid]) => window.__quizComponent.open(id, qid), [unitId, questionId]);
    await page.waitForSelector('.quiz-answer');
    assert.equal(
      await page.locator('.dialog-scroll').evaluate((node) => node.scrollTop),
      0,
      'new question or review begins at its title',
    );
  };
  async function answer(label) {
    await page.locator(`.quiz-radio[value="${label}"]`).check();
    await page.locator('.quiz-submit').click();
  }
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(url);
    await page.waitForFunction(() => window.__quizComponent);
    assert.equal(
      providerRequests.length,
      actions.length,
      'no provider request without an explicit action',
    );
    await page.locator('#launch').click();
    assert.equal(await page.locator('.quiz-radio').count(), 4);
    assert.equal(await page.locator('.quiz-explanation-video').count(), 0);
    assert.equal(await page.locator('.quiz-form-link').count(), 0);
    assert.equal(await page.locator('img,iframe,video').count(), 0);
    const metrics = await page.evaluate(() => {
      const rect = (node) => {
        const r = node.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      };
      const scroll = document.querySelector('.dialog-scroll');
      return {
        dialog: rect(document.querySelector('dialog')),
        close: rect(document.querySelector('#close-dialog')),
        option: rect(document.querySelector('.quiz-option')),
        font: parseFloat(getComputedStyle(document.querySelector('.quiz-option')).fontSize),
        titleFont: parseFloat(getComputedStyle(document.querySelector('#dialog-title')).fontSize),
        pageOverflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
        horizontalOverflow: scroll.scrollWidth > scroll.clientWidth + 1,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
      };
    });
    assert.equal(metrics.font, width <= 550 ? 16 : 18);
    assert.equal(metrics.titleFont, width <= 550 ? 24 : 28);
    assert.ok(metrics.dialog.x >= 11 && metrics.dialog.right <= width - 11);
    assert.ok(metrics.dialog.y >= 11 && metrics.dialog.bottom <= height - 11);
    assert.ok(metrics.close.width >= 44 && metrics.close.height >= 44);
    assert.ok(metrics.option.height >= 44);
    assert.equal(metrics.pageOverflow, false);
    assert.equal(metrics.horizontalOverflow, false);
    assert.ok(metrics.scrollHeight > metrics.clientHeight);
    // A hidden scroll container ignores scrollTop writes. Reopening must reset
    // after showModal makes it visible, while popup returns retain current scroll.
    await page.locator('.dialog-scroll').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await page.keyboard.press('Escape');
    await page.waitForSelector('#detail-dialog', { state: 'hidden' });
    await open('S01');
    metrics.reopenedScrollTop = await page
      .locator('.dialog-scroll')
      .evaluate((node) => node.scrollTop);
    layouts.push({ width, height, ...metrics });
    await page.screenshot({ path: `test-results/quiz-component-${width}-unanswered.png` });
    await answer('B');
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-result'), 'incorrect');
    assert.equal(await page.locator('.quiz-explanation-video').count(), 0);
    assert.equal(await page.evaluate(() => window.__quizComponent.sessions.get('S01').count), 0);
    await page.screenshot({ path: `test-results/quiz-component-${width}-retry.png` });
    if (width === 1366) await popup('.quiz-question-video');
    // Keyboard arrow navigation remains a single radio choice, then Enter submits.
    await page.locator('.quiz-radio[value="B"]').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('.quiz-radio:checked').getAttribute('value'), 'A');
    await page.locator('.quiz-submit').focus();
    const retainedForm = await page.locator('.quiz-answer').evaluate((node) => {
      node.dataset.identity = 'retained';
      return true;
    });
    assert.equal(retainedForm, true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-result'), 'correct');
    assert.equal(await page.locator('.quiz-answer').getAttribute('data-identity'), 'retained');
    assert.equal(await page.locator('.quiz-explanation-video').count(), 1);
    assert.match(
      await page.locator('.quiz-explanation-text').textContent(),
      /<img src=x onerror=alert\(1\)>/,
    );
    assert.equal(await page.locator('img').count(), 0);
    if (width === 1366) await popup('.quiz-explanation-video', true);
    await page.locator('.quiz-explanation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/quiz-component-${width}-explanation.png` });
    for (const data of units) {
      for (const question of data.questions) {
        await open(data.unitId, question.id);
        if (question.id === data.questions.at(-1).id)
          assert.equal(
            await page.locator('.quiz-form-link').count(),
            0,
            'Form is locked before the final pass',
          );
        const selected =
          data.schemaVersion === 1 ? question.correctOption : question.correctOptions.at(-1);
        await answer(selected);
      }
      assert.equal(await page.locator('.quiz-form-link').count(), 1);
      assert.equal(await page.locator('.quiz-form-link').getAttribute('href'), data.googleFormUrl);
      assert.equal(
        await page.evaluate((id) => window.__quizComponent.sessions.get(id).complete, data.unitId),
        true,
      );
      if (width === 1366 && data.unitId === 'S01') await popup('.quiz-form-link', true);
    }
    await open('S01', 'Q01');
    await answer('B');
    assert.equal(await page.locator('.quiz-explanation-video').count(), 1);
    assert.equal(await page.locator('.quiz-form-link').count(), 1);
    assert.equal(await page.evaluate(() => window.__quizComponent.sessions.get('S01').count), 4);
    const allSafe = await page
      .locator('.quiz-content a')
      .evaluateAll((links) =>
        links.every((link) => link.target === '_blank' && link.rel === 'noopener noreferrer'),
      );
    assert.equal(allSafe, true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.querySelector('dialog').open && document.activeElement.id === 'launch',
    );
    assert.equal(context.pages().length, 1);
    console.log(
      `PASS ${width}x${height}: readable contained Modal, native radio keyboard, v1/v2 four/five completion, retry/review and exact safe links`,
    );
  }
  // The old form object must not submit after shared-dialog ownership changes,
  // including a native close/reopen in the same JavaScript task.
  await page.reload();
  await page.waitForFunction(() => window.__quizComponent);
  const stale = await page.evaluate(() => {
    const { open, dialog, sessions } = window.__quizComponent;
    open('S01', 'Q01');
    const old = document.querySelector('.quiz-answer');
    old.querySelector('input').checked = true;
    document.querySelector('dialog').close();
    open('S02', 'Q01');
    old.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return {
      oldCount: sessions.get('S01').count,
      newUnit: document.querySelector('.quiz-content').dataset.unit,
    };
  });
  assert.deepEqual(stale, { oldCount: 0, newUnit: 'S02' });
  await page.waitForTimeout(40);
  await answer('C');
  assert.equal(await page.evaluate(() => window.__quizComponent.sessions.get('S02').count), 1);
  await page.locator('#close-dialog').click();
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  assert.equal(
    await page.evaluate(() => window.__quizComponent.controller.open('S01', 'Q05')),
    false,
  );
  await page.setViewportSize({ width: 390, height: 320 });
  await open('S03', 'Q01');
  await page.locator('#dialog-title').evaluate((node) => {
    node.textContent = '長標題測試'.repeat(70);
  });
  await page.locator('.dialog-scroll').evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const stress = await page.evaluate(() => {
    const d = document.querySelector('dialog').getBoundingClientRect(),
      c = document.querySelector('#close-dialog').getBoundingClientRect(),
      s = document.querySelector('.dialog-scroll');
    return {
      top: d.top,
      bottom: d.bottom,
      closeBottom: c.bottom,
      scrollTop: s.scrollTop,
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    };
  });
  assert.ok(
    stress.top >= 11 &&
      stress.bottom <= 309 &&
      stress.closeBottom <= stress.bottom &&
      stress.scrollTop > 0 &&
      !stress.overflow,
  );
  assert.deepEqual(errors, []);
  assert.equal(providerRequests.length, actions.length);
  assert.ok(providerRequests.every((item) => item.referer === null));
  await writeFile(
    'test-results/quiz-component-layout.json',
    JSON.stringify({ layouts, stress, actions, providerRequests }, null, 2) + '\n',
  );
  console.log(
    'PASS stale detached form, rapid native close/reopen, nonexistent Q05 and 390x320 extreme heading',
  );
  console.log(
    `PASS ${actions.length} native intercepted external actions: no opener/referrer, unchanged Modal and scroll; no automatic navigation`,
  );
} finally {
  await browser.close();
  await server.close();
}
