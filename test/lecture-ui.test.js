import assert from 'node:assert/strict';
import test from 'node:test';
import { createLectureController } from '../src/lecture-ui.js';

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.ownText = '';
  }
  set textContent(value) {
    this.children = [];
    this.ownText = String(value);
  }
  get textContent() {
    return this.ownText + this.children.map((child) => child.textContent).join('');
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  append(...children) {
    this.children.push(...children);
  }
}
const descendants = (root, tag) =>
  [root, ...root.children.flatMap((child) => descendants(child, tag))].filter(
    (node) => node.tagName === tag.toUpperCase(),
  );
function harness(t, load, demo = false) {
  const before = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  t.after(() => {
    if (before === undefined) delete globalThis.document;
    else globalThis.document = before;
  });
  const dialog = {
    open: false,
    revision: 0,
    updates: 0,
    scrollTop: 0,
    source: null,
    showContent(title, node, source, kicker, options) {
      this.title = title;
      this.content = node;
      this.source = source;
      this.kicker = kicker;
      this.kind = options.kind;
      this.open = true;
      this.scrollTop = 0;
      return ++this.revision;
    },
    replaceContent(node, revision) {
      if (!this.open || this.revision !== revision) return false;
      this.updates++;
      this.content = node;
      return true;
    },
    close() {
      this.open = false;
      this.revision++;
    },
  };
  const controller = createLectureController({ dialog, loader: { load }, demo });
  return { dialog, controller };
}
const lecture = (unitId = 'S01', count = 1) => ({
  unitId,
  title: `${unitId} 課程影片`,
  videos: Array.from({ length: count }, (_, i) => ({
    title: `教學影片 ${i + 1}`,
    url: `https://youtu.be/DEMO${String(i + 1).padStart(7, '0')}?t=${i + 1}`,
  })),
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('opens the shared dialog immediately in loading state and retains its source', async (t) => {
  const pending = deferred();
  const { dialog, controller } = harness(t, () => pending.promise);
  const source = {};
  assert.deepEqual(controller.snapshot(), { status: 'idle', unitId: null, videoCount: 0 });
  const done = controller.open('S01', source);
  assert.equal(dialog.open, true);
  assert.equal(dialog.source, source);
  assert.equal(dialog.kind, 'lecture');
  assert.equal(dialog.title, 'S01 — Lecture Videos');
  assert.match(dialog.content.textContent, /正在載入 S01/);
  assert.equal(descendants(dialog.content, 'p')[0].getAttribute('role'), 'status');
  assert.deepEqual(controller.snapshot(), { status: 'loading', unitId: 'S01', videoCount: 0 });
  pending.resolve(lecture());
  await done;
  assert.deepEqual(controller.snapshot(), { status: 'ready', unitId: 'S01', videoCount: 1 });
});

for (const count of [1, 4, 10, 40])
  test(`${count} videos use one ordered list with native safe external links`, async (t) => {
    const input = lecture('S03', count);
    const { dialog, controller } = harness(t, async () => input);
    await controller.open('S03');
    const links = descendants(dialog.content, 'a');
    assert.equal(descendants(dialog.content, 'ol').length, 1);
    assert.equal(descendants(dialog.content, 'li').length, count);
    assert.equal(links.length, count);
    links.forEach((link, i) => {
      assert.equal(link.getAttribute('href'), input.videos[i].url);
      assert.equal(link.getAttribute('target'), '_blank');
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
      assert.match(link.getAttribute('aria-label'), /另開新分頁/);
      assert.ok(link.textContent.includes(input.videos[i].title));
    });
    assert.equal(descendants(dialog.content, 'iframe').length, 0);
    assert.equal(descendants(dialog.content, 'video').length, 0);
    assert.equal(controller.snapshot().videoCount, count);
    assert.doesNotMatch(dialog.content.textContent, /測試連結，並非正式課程教材/);
    dialog.scrollTop = 420;
    const revision = dialog.revision;
    // Links have no controller event handlers: only the browser opens the tab.
    assert.ok(links.every((link) => link.onclick === undefined));
    assert.equal(dialog.open, true);
    assert.equal(dialog.revision, revision);
    assert.equal(dialog.scrollTop, 420);
  });

test('JSON order, duplicates, mixed titles and exact URLs remain unchanged', async (t) => {
  const input = lecture('S04', 4);
  input.title = '不分語言的單一清單';
  input.videos = [
    { title: '第三部先看', url: 'https://www.youtube.com/watch?v=DEMO0000003&t=17s' },
    { title: 'English second', url: 'https://youtu.be/DEMO0000001?start=7#section' },
    { title: '第一部最後看', url: 'https://youtu.be/DEMO0000002' },
    { title: '第三部先看', url: 'https://www.youtube.com/watch?v=DEMO0000003&t=17s' },
  ];
  const expected = structuredClone(input);
  const { dialog, controller } = harness(t, async () => input);
  await controller.open('S04');
  assert.deepEqual(
    descendants(dialog.content, 'a').map((link) => link.getAttribute('href')),
    expected.videos.map((video) => video.url),
  );
  const titles = descendants(dialog.content, 'span').filter(
    (node) => node.className === 'lecture-video-title',
  );
  assert.deepEqual(
    titles.map((node) => node.textContent),
    expected.videos.map((video) => video.title),
  );
  assert.deepEqual(input, expected);
});

test('titles and error details are plain text, not executable markup', async (t) => {
  const input = lecture();
  input.title = '<script>window.bad = true</script>';
  input.videos[0].title = '<img src=x onerror=alert(1)> 教學';
  const { dialog, controller } = harness(t, async () => input);
  await controller.open('S01');
  assert.ok(dialog.content.textContent.includes(input.title));
  assert.ok(dialog.content.textContent.includes(input.videos[0].title));
  assert.equal(descendants(dialog.content, 'script').length, 0);
  assert.equal(descendants(dialog.content, 'img').length, 0);
});

test('empty lecture has the requested message and no fabricated link', async (t) => {
  const { dialog, controller } = harness(t, async () => lecture('S01', 0));
  await controller.open('S01');
  assert.match(dialog.content.textContent, /本單元尚無課程影片/);
  assert.equal(descendants(dialog.content, 'a').length, 0);
  assert.deepEqual(controller.snapshot(), { status: 'empty', unitId: 'S01', videoCount: 0 });
});

test('failed validation or missing data shows a useful safe error without a link', async (t) => {
  const { dialog, controller } = harness(t, async () => {
    throw new Error('HTTP 404：S05 <svg onload=alert(1)>');
  });
  await controller.open('S05');
  assert.match(dialog.content.textContent, /S05 課程影片載入失敗/);
  assert.match(dialog.content.textContent, /HTTP 404/);
  assert.equal(dialog.content.getAttribute('role'), 'alert');
  assert.equal(descendants(dialog.content, 'svg').length, 0);
  assert.equal(descendants(dialog.content, 'a').length, 0);
  assert.deepEqual(controller.snapshot(), { status: 'error', unitId: 'S05', videoCount: 0 });
});

test('a slower previous unit cannot replace the new unit or its title', async (t) => {
  const first = deferred(),
    second = deferred();
  const { dialog, controller } = harness(t, (unitId) =>
    unitId === 'S01' ? first.promise : second.promise,
  );
  const a = controller.open('S01');
  const b = controller.open('S02');
  second.resolve(lecture('S02', 4));
  await b;
  const accepted = dialog.content;
  first.resolve(lecture('S01', 1));
  await a;
  assert.equal(dialog.content, accepted);
  assert.equal(dialog.title, 'S02 — Lecture Videos');
  assert.deepEqual(controller.snapshot(), { status: 'ready', unitId: 'S02', videoCount: 4 });
  assert.equal(dialog.updates, 1);
});

test('a delayed error cannot overwrite a later success, including reopening the same unit', async (t) => {
  const first = deferred();
  let calls = 0;
  const { dialog, controller } = harness(t, () =>
    ++calls === 1 ? first.promise : Promise.resolve(lecture()),
  );
  const a = controller.open('S01');
  await controller.open('S01');
  const accepted = dialog.content;
  first.reject(new Error('late HTTP failure'));
  await a;
  assert.equal(dialog.content, accepted);
  assert.equal(controller.snapshot().status, 'ready');
});

test('closing during a request cannot reopen or update the dialog', async (t) => {
  const first = deferred();
  const { dialog, controller } = harness(t, () => first.promise);
  const a = controller.open('S01');
  dialog.close();
  first.resolve(lecture());
  await a;
  assert.equal(dialog.open, false);
  assert.equal(dialog.updates, 0);
  assert.equal(controller.snapshot().status, 'closed');
});

test('another modal owns the dialog revision and is protected from delayed Lecture data', async (t) => {
  const first = deferred();
  const { dialog, controller } = harness(t, () => first.promise);
  const a = controller.open('S01');
  const about = new FakeElement('p');
  about.textContent = 'NPC or operation instructions';
  dialog.showContent('Q01', about, {}, 'NPC', { kind: '' });
  first.resolve(lecture());
  await a;
  assert.equal(dialog.content, about);
  assert.equal(dialog.title, 'Q01');
  assert.equal(dialog.updates, 0);
  assert.equal(controller.snapshot().status, 'closed');
});

test('Demo explicitly identifies safe test links as non-course material', async (t) => {
  const { dialog, controller } = harness(t, async () => lecture(), true);
  await controller.open('S01');
  assert.match(dialog.content.textContent, /測試連結，並非正式課程教材/);
});
