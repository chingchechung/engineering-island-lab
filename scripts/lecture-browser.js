import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkLectures(page, base, productionBase, pass) {
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const ready = () => page.waitForSelector('.lecture-content[data-state="ready"]');
  const close = async () => {
    await page.keyboard.press('Escape');
    await page.waitForSelector('#detail-dialog', { state: 'hidden' });
  };
  const focus = async (id) => {
    await page.selectOption('#unit-navigation', id);
    await page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.002 &&
        s.target.every((v, i) => Math.abs(v - s.goalTarget[i]) < 0.003)
      );
    });
  };
  const load = async (query = '?demo=1&units=12&open=4&questions=5') => {
    await page.goto(base + '/' + query);
    await page.waitForFunction(() => window.__islandLab);
  };
  const open = async (id) => {
    await focus(id);
    await page.locator(`[data-label="${id === 'S01' ? 'lecture' : id + '-lecture'}"]`).click();
  };
  const shot = (name) => page.screenshot({ path: `test-results/lecture-${name}.png` });
  const camera = (s) => ({
    target: s.target,
    goal: s.goalTarget,
    zoom: s.zoom,
    goalZoom: s.goalZoom,
    azimuth: s.azimuth,
    elevation: s.elevation,
    azimuthGoal: s.azimuthGoal,
    elevationGoal: s.elevationGoal,
  });
  const measurements = [];
  await page.setViewportSize({ width: 1366, height: 768 });
  await load();
  for (const [id, count, file] of [
    ['S01', 1, 'S01-one'],
    ['S02', 4, 'S02-four'],
    ['S03', 10, 'S03-ten'],
    ['S04', 3, 'S04-order'],
  ]) {
    await open(id);
    await ready();
    assert.equal(await page.locator('.lecture-video-link').count(), count);
    assert.equal(await page.locator('#detail-dialog iframe, #detail-dialog video').count(), 0);
    assert.match(await page.locator('.lecture-content').textContent(), /示範|測試/);
    if (id === 'S04')
      assert.deepEqual(
        await page
          .locator('.lecture-video-link')
          .evaluateAll((es) =>
            es.map((e) => e.textContent).map((s) => s.match(/第[一二三]章/)?.[0]),
          ),
        ['第三章', '第一章', '第二章'],
      );
    if (id === 'S02')
      assert.deepEqual(
        await page
          .locator('.lecture-video-link')
          .evaluateAll((es) => es.map((e) => new URL(e.href).searchParams.get('v'))),
        ['DEMO0000004', 'DEMO0000002', 'DEMO0000008', 'DEMO0000001'],
      );
    await shot(file);
    await close();
  }
  pass(
    'Lecture 1/4/10 videos, Chinese-only and mixed titles retain JSON order without embedding or grouping',
  );

  await open('S03');
  await ready();
  const scroll = page.locator('.dialog-scroll');
  const initial = await page.locator('#dialog-title').boundingBox();
  await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
  const frozen = await state();
  const afterTitle = await page.locator('#dialog-title').boundingBox();
  assert.ok(
    Math.abs(initial.y - afterTitle.y) < 2,
    'Lecture heading stays fixed while the list scrolls',
  );
  const bounds = await scroll.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.8);
  await page.mouse.wheel(0, -180);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 40, bounds.y + 60, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.press('Home');
  assert.deepEqual(camera(await state()), camera(frozen));
  assert.notDeepEqual((await state()).sea.whales[0].position, frozen.sea.whales[0].position);
  const link = page.locator('.lecture-video-link').nth(9);
  await link.scrollIntoViewIfNeeded();
  const top = await scroll.evaluate((el) => el.scrollTop),
    expected = await link.getAttribute('href');
  const context = page.context();
  const externalRoute = (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>測試攔截 YouTube，沒有連線外站</title><p>測試頁</p>',
    });
  await context.route(/^https:\/\/(www\.)?youtube\.com\//, externalRoute);
  try {
    const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await popup.waitForLoadState();
    assert.equal(popup.url(), expected);
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    await popup.close();
    await page.bringToFront();
    assert.equal((await state()).dialog, true);
    assert.equal(await scroll.evaluate((el) => el.scrollTop), top);
    assert.equal(await link.getAttribute('target'), '_blank');
    const rel = (await link.getAttribute('rel')).split(/\s+/);
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'));
  } finally {
    await context.unroute(/^https:\/\/(www\.)?youtube\.com\//, externalRoute);
  }
  await close();
  pass(
    'Lecture title stays fixed, Modal isolates camera, safe YouTube popup retains opener isolation and original scroll',
  );

  await page.locator('#day-night').click();
  await page.waitForFunction(() => window.__islandLab.snapshot().lighting.blend === 1);
  await open('S02');
  await ready();
  await shot('night');
  await close();
  await page.goto(base + '/?demo=1&units=12&open=4&mode=video-only');
  await page.waitForFunction(() => window.__islandLab);
  await open('S02');
  await ready();
  assert.equal((await state()).npcCount, 0);
  assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
  await shot('video-only');
  await close();
  pass(
    'Night and Video-only share Lecture lists, without altering scene life or generating question NPCs',
  );

  for (const [width, height] of [
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await open('S03');
    await ready();
    const layout = await page.evaluate(() => {
      const d = document.querySelector('dialog').getBoundingClientRect(),
        s = document.querySelector('.dialog-scroll'),
        a = document.querySelector('.lecture-video-link'),
        c = document.querySelector('#close-dialog').getBoundingClientRect();
      return {
        dialog: { x: d.x, y: d.y, width: d.width, height: d.height, bottom: d.bottom },
        scroll: s.scrollHeight > s.clientHeight,
        horizontal: s.scrollWidth > s.clientWidth + 1,
        page:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight,
        size: parseFloat(getComputedStyle(a).fontSize),
        linkHeight: a.getBoundingClientRect().height,
        close: [c.width, c.height],
      };
    });
    assert.ok(layout.dialog.y >= 11 && layout.dialog.bottom <= height - 11);
    assert.equal(layout.horizontal, false);
    assert.equal(layout.page, false);
    assert.ok(layout.size >= (width === 390 ? 16 : 18));
    assert.ok(layout.linkHeight >= 44);
    assert.ok(layout.close.every((v) => v >= 44));
    if (width === 390) assert.equal(layout.scroll, true);
    measurements.push({ width, height, ...layout });
    await shot(String(width));
    await close();
  }
  pass(
    '1920px and 390px Lecture lists remain readable, scroll internally and preserve 44px targets',
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await load('?demo=1&units=12&open=4');
  await focus('S05');
  await page.locator('[data-label="S05-lecture"]').click();
  assert.equal((await state()).dialog, false);
  await shot('locked');
  await load('?demo=1&units=12&open=5');
  await open('S05');
  await page.waitForSelector('.lecture-content[data-state="error"]');
  assert.match(await page.locator('.lecture-content').textContent(), /404|失敗/);
  assert.equal(await page.locator('.lecture-video-link').count(), 0);
  await shot('missing');
  await close();
  pass(
    'unpublished islands remain locked; missing Lecture data shows a clear error without fallback links',
  );

  // These official-looking responses are test-only HTTP intercepts, never public files.
  const official = {
    courseTitle: 'Lecture 測試課程',
    totalUnits: 12,
    assignmentMode: 'video-only',
  };
  let manifest = {
    schemaVersion: 1,
    units: [
      { unitId: 'S01', title: '第一單元', file: 'S01.json' },
      { unitId: 'S02', title: '第二單元', file: 'S02.json' },
    ],
  };
  const responseMap = new Map();
  const requests = [];
  const entry = (id, videos) => ({ unitId: id, title: '原始 Lecture 標題', videos });
  const video = {
    title: '安全原始影片標題',
    url: 'https://www.youtube.com/watch?v=abcdefghijk&t=42#chapter',
  };
  responseMap.set('S01', { json: entry('S01', []) });
  responseMap.set('S02', { json: entry('S02', [video]) });
  let delayed = null;
  const courseRoute = (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(official) });
  const manifestRoute = (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
  const videoRoute = async (route) => {
    const url = new URL(route.request().url()),
      id = url.pathname.match(/(S\d{2})\.json$/)[1];
    requests.push({ id, path: url.pathname });
    if (delayed && id === 'S01') await delayed.promise;
    const data = responseMap.get(id);
    await route.fulfill({
      status: data?.status ?? (data ? 200 : 404),
      contentType: 'application/json',
      body: data?.body ?? JSON.stringify(data?.json ?? {}),
    });
  };
  await page.route('**/course-config.json', courseRoute);
  await page.route('**/assignments/manifest.json', manifestRoute);
  await page.route('**/course-videos/*.json', videoRoute);
  try {
    await page.goto(base + '/');
    await page.waitForFunction(() => window.__islandLab);
    assert.equal(await page.locator('.label-locked').count(), 10);
    await open('S01');
    await page.waitForSelector('.lecture-content[data-state="empty"]');
    assert.match(await page.locator('.lecture-content').textContent(), /本單元尚無課程影片/);
    await shot('empty');
    await close();
    responseMap.set('S01', { body: '{ broken json' });
    await page.reload();
    await page.waitForFunction(() => window.__islandLab);
    await open('S01');
    await page.waitForSelector('.lecture-content[data-state="error"]');
    assert.equal(await page.locator('.lecture-video-link').count(), 0);
    await shot('json-error');
    await close();
    responseMap.set('S01', {
      json: entry('S01', [{ title: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }]),
    });
    await open('S01');
    await page.waitForSelector('.lecture-content[data-state="error"]');
    assert.equal(await page.locator('#dialog-content a,#dialog-content img').count(), 0);
    await close();
    pass(
      'runtime empty lists and malformed JSON/unsafe URLs produce distinct safe states with no actionable invalid link',
    );

    responseMap.set('S01', { json: entry('S01', [video]) });
    delayed = {};
    delayed.promise = new Promise((resolve) => (delayed.release = resolve));
    const countBefore = requests.filter((r) => r.id === 'S01').length;
    await open('S01');
    await page.waitForSelector('.lecture-content[data-state="loading"]');
    await page.waitForFunction(() => window.__islandLab.snapshot().lecture.status === 'loading');
    await close();
    await open('S02');
    await ready();
    delayed.release();
    delayed = null;
    await page.waitForTimeout(800);
    assert.match(await page.locator('#dialog-title').textContent(), /^S02/);
    assert.equal(await page.locator('.lecture-video-link').getAttribute('href'), video.url);
    await close();
    await open('S02');
    await ready();
    assert.equal(requests.filter((r) => r.id === 'S02').length, 1);
    await close();
    assert.ok(requests.filter((r) => r.id === 'S01').length > countBefore);
    await focus('S03');
    await page.locator('[data-label="S03-lecture"]').click();
    assert.equal((await state()).dialog, false);
    assert.equal(
      requests.some((r) => r.id === 'S03'),
      false,
    );
    pass(
      'delayed old responses cannot overwrite another unit; successful cache avoids refetch and locked units never request data',
    );

    responseMap.set('S01', {
      json: entry(
        'S01',
        Array.from({ length: 30 }, (_, i) => ({
          title: `${i + 1} 長標題 ${'無英文也能閱讀'.repeat(18)}`,
          url: video.url,
        })),
      ),
    });
    await page.reload();
    await page.waitForFunction(() => window.__islandLab);
    await open('S01');
    await ready();
    assert.equal(await page.locator('.lecture-video-link').count(), 30);
    assert.equal(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth + 1), false);
    await shot('thirty-long');
    await close();
    pass(
      '30 videos and long unbroken titles wrap without sorting, truncating the list or overflowing the page',
    );

    official.totalUnits = 15;
    manifest = {
      schemaVersion: 1,
      units: [{ unitId: 'S15', title: '第15單元', file: 'S15.json' }],
    };
    responseMap.set('S15', { json: entry('S15', [video]) });
    await page.goto(productionBase + '?demo=1&units=1&open=15&mode=quiz');
    await page.waitForSelector('#loading[hidden]', { state: 'attached' });
    assert.equal(await page.evaluate(() => typeof window.__islandLab), 'undefined');
    assert.equal(await page.locator('.label-locked').count(), 14);
    await page.selectOption('#unit-navigation', 'S15');
    await page.waitForTimeout(1400);
    await page.locator('[data-label="S15-lecture"]').click();
    await ready();
    assert.ok(
      requests.some(
        (r) =>
          r.id === 'S15' && r.path === '/~wildwolf/engineering-island-lab/course-videos/S15.json',
      ),
    );
    assert.equal(await page.locator('[data-label*="Q0"]').count(), 0);
    await shot('apache-production');
    await close();
    pass(
      'Apache production loads fixed relative S15 Lecture URL from the official Manifest, ignoring every Demo override',
    );
  } finally {
    delayed?.release();
    await page.unroute('**/course-config.json', courseRoute);
    await page.unroute('**/assignments/manifest.json', manifestRoute);
    await page.unroute('**/course-videos/*.json', videoRoute);
  }
  await writeFile(
    'test-results/lecture-layout.json',
    JSON.stringify({ measurements, requests }, null, 2) + '\n',
  );
  await page.setViewportSize({ width: 1366, height: 768 });
}
