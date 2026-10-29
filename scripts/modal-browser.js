import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function checkModalReadability(page, base, pass) {
  const state = () => page.evaluate(() => window.__islandLab.snapshot());
  const settle = () =>
    page.waitForFunction(() => {
      const s = window.__islandLab.snapshot();
      return (
        Math.abs(s.zoom - s.goalZoom) < 0.01 &&
        s.target.every((v, i) => Math.abs(v - s.goalTarget[i]) < 0.015)
      );
    });
  await page.goto(`${base}/?demo=1&units=12&open=4&questions=5`);
  await page.waitForFunction(() => window.__islandLab);
  await page.selectOption('#unit-navigation', 'S01');
  await settle();
  const measurements = [];
  async function inspect() {
    return page.evaluate(() => {
      const dialog = document.querySelector('#detail-dialog');
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          right: r.right,
          bottom: r.bottom,
        };
      };
      const styles = (el) => {
        const s = getComputedStyle(el);
        return {
          size: parseFloat(s.fontSize),
          lineHeight: parseFloat(s.lineHeight),
          color: s.color,
        };
      };
      const luminance = (color) => {
        const channels = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const background = getComputedStyle(dialog).backgroundColor;
      const contrast = (color) => {
        const a = luminance(color),
          b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const title = styles(dialog.querySelector('h2'));
      const body = styles(dialog.querySelector('p'));
      const kicker = styles(dialog.querySelector('.eyebrow'));
      const note = styles(dialog.querySelector('.dialog-footer'));
      const scroll = dialog.querySelector('.dialog-scroll');
      return {
        viewport: [innerWidth, innerHeight],
        dialog: rect(dialog),
        close: rect(dialog.querySelector('#close-dialog')),
        footer: rect(dialog.querySelector('.dialog-footer')),
        title,
        body,
        kicker,
        note,
        contrast: {
          title: contrast(title.color),
          body: contrast(body.color),
          kicker: contrast(kicker.color),
          note: contrast(note.color),
        },
        scroll: {
          ...rect(scroll),
          clientHeight: scroll.clientHeight,
          scrollHeight: scroll.scrollHeight,
          clientWidth: scroll.clientWidth,
          scrollWidth: scroll.scrollWidth,
        },
        pageOverflow:
          document.documentElement.scrollWidth > innerWidth + 1 ||
          document.documentElement.scrollHeight > innerHeight + 1 ||
          scrollX !== 0 ||
          scrollY !== 0,
      };
    });
  }
  function check(m) {
    const [width, height] = m.viewport,
      narrow = width <= 550;
    assert.ok(Math.abs(m.dialog.width - (narrow ? width - 24 : 620)) < 1);
    assert.ok(Math.abs(m.dialog.x + m.dialog.width / 2 - width / 2) < 1);
    assert.ok(Math.abs(m.dialog.y + m.dialog.height / 2 - height / 2) < 1);
    assert.ok(m.dialog.y >= 11 && m.dialog.bottom <= height - 11);
    assert.equal(m.title.size, narrow ? 24 : 28);
    assert.equal(m.body.size, narrow ? 16 : 18);
    assert.ok(m.body.lineHeight / m.body.size >= 1.7 && m.body.lineHeight / m.body.size <= 1.8);
    assert.equal(m.kicker.size, 14);
    assert.equal(m.note.size, 13);
    assert.ok(m.contrast.body >= 7);
    assert.ok(Object.values(m.contrast).every((value) => value >= 4.5));
    assert.ok(m.close.width >= 44 && m.close.height >= 44);
    assert.ok(m.close.y >= m.dialog.y && m.close.bottom <= m.dialog.bottom);
    assert.ok(m.footer.y >= m.dialog.y && m.footer.bottom <= m.dialog.bottom);
    assert.ok(m.scroll.scrollWidth <= m.scroll.clientWidth + 1);
    assert.equal(m.pageOverflow, false);
  }
  const selectors = {
    lecture: '[data-label="lecture"]',
    npc: '[data-label="Q05"]',
    about: '#about',
  };
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await settle();
    for (const kind of ['lecture', 'npc', 'about']) {
      await page.locator(selectors[kind]).click();
      assert.equal((await state()).dialog, true);
      if (kind === 'npc')
        assert.equal(
          (await state()).npcs.find((n) => n.unitId === 'S01' && n.id === 'Q05').paused,
          true,
        );
      const m = await inspect();
      check(m);
      measurements.push({ kind, ...m });
      await page.screenshot({ path: `test-results/modal-${kind}-${width}.png` });
      if (kind === 'lecture') await page.locator('#close-dialog').click();
      else await page.keyboard.press('Escape');
      await page.waitForFunction(() => !window.__islandLab.snapshot().dialog);
      assert.equal(await page.locator('#detail-dialog').isVisible(), false);
      if (kind === 'npc') {
        await page.waitForFunction(
          () =>
            !window.__islandLab.snapshot().npcs.find((n) => n.unitId === 'S01' && n.id === 'Q05')
              .paused,
        );
        assert.equal(await page.evaluate(() => document.activeElement.dataset.label), 'Q05');
      }
      if (kind === 'about')
        assert.equal(await page.evaluate(() => document.activeElement.id), 'about');
      pass(
        `${width}x${height} ${kind} Modal has readable type, contrast, centered bounds and visible close button`,
      );
    }
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await settle();
  for (const id of ['Q01', 'Q02', 'Q03', 'Q04', 'Q05']) {
    await page.locator(`[data-label="${id}"]`).click();
    const opened = await state(),
      npc = opened.npcs.find((n) => n.unitId === 'S01' && n.id === id);
    assert.equal(npc.paused, true);
    if (id === 'Q05') {
      await page.waitForFunction(
        (before) => {
          const now = window.__islandLab.snapshot();
          return (
            now.sea.seaTime > before.sea.seaTime + 0.2 &&
            JSON.stringify(now.animals.map((a) => a.position)) !==
              JSON.stringify(before.animals.map((a) => a.position)) &&
            JSON.stringify(now.sea.whales.map((a) => a.position)) !==
              JSON.stringify(before.sea.whales.map((a) => a.position)) &&
            JSON.stringify(now.visitors.map((a) => a.position)) !==
              JSON.stringify(before.visitors.map((a) => a.position))
          );
        },
        opened,
        { timeout: 10000 },
      );
      await page.keyboard.press('+');
      const scroll = await page.locator('.dialog-scroll').boundingBox();
      await page.mouse.move(scroll.x + scroll.width / 2, scroll.y + scroll.height / 2);
      await page.mouse.wheel(0, 400);
      const during = await state();
      assert.deepEqual(
        during.npcs.find((n) => n.unitId === 'S01' && n.id === id).position,
        npc.position,
      );
      assert.ok(Math.abs(during.zoom - opened.zoom) < 0.01);
      assert.ok(during.target.every((v, i) => Math.abs(v - opened.target[i]) < 0.015));
    }
    await page.locator('#close-dialog').click();
    await page.waitForFunction(
      (id) =>
        !window.__islandLab.snapshot().npcs.find((n) => n.unitId === 'S01' && n.id === id).paused,
      id,
    );
  }
  pass(
    'all five question Modals pause and resume; animals, whales and visitors keep moving while camera input stays isolated',
  );

  for (const [width, height] of [
    [1366, 768],
    [390, 320],
  ]) {
    await page.setViewportSize({ width, height });
    await settle();
    await page.locator('[data-label="lecture"]').click();
    await page.evaluate(() => {
      document.querySelector('#dialog-title').textContent = '長標題與長內容的響應式測試 '.repeat(5);
      for (let i = 0; i < 24; i++) {
        const p = document.createElement('p');
        p.textContent = `Demo 段落 ${i + 1}：測試長內容只在 Modal 內捲動，標頭及關閉按鈕仍可操作。 ${'LongDemoToken'.repeat(12)}`;
        document.querySelector('#dialog-content').append(p);
      }
    });
    const m = await inspect();
    check(m);
    assert.ok(m.scroll.scrollHeight > m.scroll.clientHeight + 300);
    measurements.push({ kind: 'long-content', ...m });
    await page.locator('.dialog-scroll').focus();
    await page.keyboard.press('PageDown');
    await page.waitForFunction(() => document.querySelector('.dialog-scroll').scrollTop > 0);
    const before = await state();
    const scroll = await page.locator('.dialog-scroll').boundingBox();
    await page.mouse.move(scroll.x + scroll.width / 2, scroll.y + scroll.height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(300);
    const after = await state();
    assert.ok(Math.abs(after.zoom - before.zoom) < 0.01);
    assert.ok(after.target.every((v, i) => Math.abs(v - before.target[i]) < 0.015));
    check(await inspect());
    await page.screenshot({ path: `test-results/modal-long-${width}.png` });
    await page.keyboard.press('Escape');
    assert.equal((await state()).dialog, false);
    pass(
      `${width}x${height} long content wraps and scrolls internally with keyboard/wheel, without page or camera movement`,
    );
  }
  await writeFile('test-results/modal-layout.json', JSON.stringify(measurements, null, 2) + '\n');
}
