import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createQuizSessions } from '../src/quiz-session.js';

// Node has no CSS module loader. Exercise the unchanged controller source after
// removing only its stylesheet import; Vite/native-browser tests cover that CSS.
const source = await readFile(new URL('../src/quiz-ui.js', import.meta.url), 'utf8');
assert.ok(source.startsWith("import './quiz.css';"));
const { createQuizController } = await import(
  `data:text/javascript;base64,${Buffer.from(source.replace("import './quiz.css';", '')).toString('base64')}`
);

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownText = '';
    this.hidden = false;
    this.checked = false;
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
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }
  submit() {
    const event = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    for (const handler of this.listeners.get('submit') ?? []) handler(event);
    return event;
  }
}
const all = (root) => [root, ...root.children.flatMap(all)];
const byClass = (root, name) =>
  all(root).filter((node) => node.className?.split(' ').includes(name));
const byTag = (root, tag) => all(root).filter((node) => node.tagName === tag.toUpperCase());

function unit(unitId = 'S01', version = 1, count = 4) {
  return {
    schemaVersion: version,
    unitId,
    title: `合成題庫 ${unitId}`,
    googleFormUrl: `https://forms.gle/IslandDemo${unitId}?source=quiz`,
    questions: Array.from({ length: count }, (_, i) => ({
      id: `Q${String(i + 1).padStart(2, '0')}`,
      title: `題目 ${i + 1}`,
      prompt: `這是 ${unitId} 第 ${i + 1} 題。\n請選擇一個答案。`,
      questionVideoUrl: `https://youtu.be/DEMO${String(i + 1).padStart(7, '0')}?t=17`,
      explanationVideoUrl: `https://www.youtube.com/watch?v=DEMO${String(i + 6).padStart(7, '0')}`,
      explanationText: `第 ${i + 1} 題解說\n第二行。`,
      options:
        version === 2 && i === 0
          ? ['第二項', '第一項', '第三項']
          : ['第二項', '第一項', '第三項', '第四項'],
      ...(version === 1
        ? { correctOption: 'ABCD'[i % 4] }
        : { correctOptions: i === 0 ? ['A', 'C'] : ['B'] }),
    })),
  };
}
function harness(t, units = [unit()], demo = false) {
  const before = globalThis.document;
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  t.after(() => {
    if (before === undefined) delete globalThis.document;
    else globalThis.document = before;
  });
  const sessions = createQuizSessions();
  units.forEach((data) => sessions.activate(data));
  const progress = [];
  const dialog = {
    open: false,
    revision: 0,
    scrollTop: 0,
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
    close() {
      this.open = false;
      this.revision++;
    },
  };
  const controller = createQuizController({
    dialog,
    sessions,
    demo,
    onProgress: (...args) => progress.push(args),
  });
  function answer(selected) {
    const form = byClass(dialog.content, 'quiz-answer')[0];
    byTag(form, 'input').forEach((radio) => {
      radio.checked = radio.value === selected;
    });
    return form.submit();
  }
  return { dialog, controller, sessions, progress, answer };
}

test('invalid unit or nonexistent Q05 cannot open a fake question', (t) => {
  const { dialog, controller } = harness(t);
  assert.equal(controller.snapshot().status, 'idle');
  assert.equal(controller.open('S02', 'Q01'), false);
  assert.equal(controller.open('S01', 'Q05'), false);
  assert.equal(dialog.open, false);
  assert.equal(dialog.revision, 0);
});

test('v1 opens the shared modal with exact option order and one required radio group', (t) => {
  const data = unit();
  const { dialog, controller } = harness(t, [data]);
  const source = {};
  assert.equal(controller.open('S01', 'Q01', source), true);
  assert.equal(dialog.source, source);
  assert.equal(dialog.title, 'S01 · Q01 · 題目 1');
  assert.equal(dialog.kind, 'quiz');
  assert.equal(dialog.kicker, 'S01 · Q01 · Quiz');
  assert.equal(dialog.content.dataset.unit, 'S01');
  assert.equal(dialog.content.dataset.question, 'Q01');
  const radios = byTag(dialog.content, 'input');
  assert.equal(radios.length, 4);
  assert.ok(
    radios.every(
      (radio) => radio.type === 'radio' && radio.name === 'quiz-answer' && radio.required,
    ),
  );
  assert.deepEqual(
    radios.map((radio) => radio.value),
    ['A', 'B', 'C', 'D'],
  );
  assert.deepEqual(
    byClass(dialog.content, 'quiz-option-copy').map((node) => node.textContent),
    data.questions[0].options.map((text, i) => `${'ABCD'[i]}. ${text}`),
  );
  assert.match(dialog.content.textContent, /Submit Answer/);
});

test('v2 three-option question never creates D and accepts A or C individually', (t) => {
  const a = unit('S01', 2),
    b = unit('S02', 2);
  const { dialog, controller, sessions, answer, progress } = harness(t, [a, b]);
  controller.open('S01', 'Q01');
  assert.deepEqual(
    byTag(dialog.content, 'input').map((radio) => radio.value),
    ['A', 'B', 'C'],
  );
  answer('A');
  assert.equal(sessions.get('S01').hasPassed('Q01'), true);
  controller.open('S02', 'Q01');
  answer('C');
  assert.equal(sessions.get('S02').hasPassed('Q01'), true);
  assert.deepEqual(progress, [
    ['S01', 'Q01'],
    ['S02', 'Q01'],
  ]);
});

test('before answering only the exact question-video link is exposed', (t) => {
  const data = unit('S13', 2);
  const { dialog, controller } = harness(t, [data]);
  controller.open('S13', 'Q01');
  const links = byTag(dialog.content, 'a');
  assert.equal(links.length, 1);
  assert.equal(links[0].textContent, 'Watch Question Video');
  assert.equal(links[0].getAttribute('href'), data.questions[0].questionVideoUrl);
  assert.equal(links[0].getAttribute('target'), '_blank');
  assert.equal(links[0].getAttribute('rel'), 'noopener noreferrer');
  assert.match(links[0].getAttribute('aria-label'), /另開新分頁/);
  assert.equal(links[0].listeners.size, 0);
  assert.equal(byTag(dialog.content, 'iframe').length, 0);
  assert.equal(byTag(dialog.content, 'video').length, 0);
  assert.equal(byClass(dialog.content, 'quiz-explanation-video').length, 0);
  assert.equal(byClass(dialog.content, 'quiz-form-link').length, 0);
});

test('wrong answers keep the modal open, permit retry and expose no explanation', (t) => {
  const { dialog, controller, sessions, answer, progress } = harness(t);
  controller.open('S01', 'Q01');
  const initial = dialog.content;
  const revision = dialog.revision;
  answer('B');
  assert.equal(dialog.open, true);
  assert.equal(dialog.content, initial);
  assert.equal(dialog.revision, revision);
  assert.equal(sessions.get('S01').count, 0);
  assert.equal(byClass(initial, 'quiz-feedback')[0].dataset.result, 'incorrect');
  assert.equal(byClass(initial, 'quiz-explanation-video').length, 0);
  assert.equal(progress.length, 0);
  answer('A');
  assert.equal(sessions.get('S01').count, 1);
});

test('passing reveals exact explanation and optional text, updates progress once per submission', (t) => {
  const data = unit();
  const { dialog, controller, answer, progress } = harness(t, [data]);
  controller.open('S01', 'Q01');
  answer('A');
  assert.match(byClass(dialog.content, 'quiz-feedback')[0].textContent, /答對了/);
  assert.match(byClass(dialog.content, 'quiz-progress')[0].textContent, /1 \/ 4/);
  const link = byClass(dialog.content, 'quiz-explanation-video')[0];
  assert.equal(link.getAttribute('href'), data.questions[0].explanationVideoUrl);
  assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(
    byClass(dialog.content, 'quiz-explanation-text')[0].textContent,
    data.questions[0].explanationText,
  );
  assert.deepEqual(progress, [['S01', 'Q01']]);
  assert.equal(dialog.content.dataset.passed, 'true');
});

test('wrong answer on another question cannot reset a previously passed question', (t) => {
  const { controller, sessions, answer } = harness(t);
  controller.open('S01', 'Q01');
  answer('A');
  controller.open('S01', 'Q02');
  answer('A');
  assert.equal(sessions.get('S01').count, 1);
  assert.equal(sessions.get('S01').hasPassed('Q01'), true);
  assert.equal(sessions.get('S01').hasPassed('Q02'), false);
});

for (const count of [4, 5])
  test(`${count}-question unit unlocks its exact Form only at ${count}/${count}`, (t) => {
    const data = unit('S15', 1, count);
    const { dialog, controller, sessions, answer } = harness(t, [data]);
    data.questions.forEach((question, i) => {
      controller.open('S15', question.id);
      assert.equal(byClass(dialog.content, 'quiz-form-link').length, 0);
      answer(question.correctOption);
      if (i < count - 1) assert.equal(byClass(dialog.content, 'quiz-form-link').length, 0);
    });
    const link = byClass(dialog.content, 'quiz-form-link')[0];
    assert.equal(link.textContent, 'Open Google Form');
    assert.equal(link.getAttribute('href'), data.googleFormUrl);
    assert.equal(link.getAttribute('target'), '_blank');
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(sessions.get('S15').complete, true);
    assert.equal(controller.snapshot().count, count);
    assert.equal(controller.snapshot().complete, true);
  });

test('reopening a passed NPC permits review and keeps explanation without another answer', (t) => {
  const { dialog, controller, answer } = harness(t);
  controller.open('S01', 'Q01');
  answer('A');
  dialog.close();
  assert.equal(controller.snapshot().status, 'closed');
  controller.open('S01', 'Q01');
  assert.equal(controller.snapshot().result, 'review');
  assert.equal(controller.snapshot().passed, true);
  assert.equal(byClass(dialog.content, 'quiz-explanation-video').length, 1);
  assert.match(byClass(dialog.content, 'quiz-feedback')[0].textContent, /這題已完成/);
});

test('wrong review retains passed status, explanation and unlocked Form', (t) => {
  const data = unit();
  const { dialog, controller, sessions, answer } = harness(t, [data]);
  data.questions.forEach((question) => {
    controller.open('S01', question.id);
    answer(question.correctOption);
  });
  controller.open('S01', 'Q01');
  answer('B');
  assert.equal(controller.snapshot().result, 'incorrect');
  assert.equal(sessions.get('S01').count, 4);
  assert.equal(byClass(dialog.content, 'quiz-explanation-video').length, 1);
  assert.equal(byClass(dialog.content, 'quiz-form-link').length, 1);
  assert.match(byClass(dialog.content, 'quiz-feedback')[0].textContent, /完成狀態與解說仍保留/);
});

test('switching units displays independent progress without clearing the other session', (t) => {
  const { dialog, controller, sessions, answer } = harness(t, [unit(), unit('S02', 2, 5)]);
  controller.open('S01', 'Q01');
  answer('A');
  controller.open('S02', 'Q01');
  assert.match(byClass(dialog.content, 'quiz-progress')[0].textContent, /S02 · 0 \/ 5/);
  answer('C');
  controller.open('S01', 'Q02');
  assert.match(byClass(dialog.content, 'quiz-progress')[0].textContent, /S01 · 1 \/ 4/);
  assert.equal(sessions.get('S02').count, 1);
});

test('all teacher text is literal DOM text with line breaks, never interpreted HTML', (t) => {
  const data = unit();
  data.title = '<script>unit()</script>';
  const question = data.questions[0];
  question.title = '<img src=x onerror=title()> 標題';
  question.prompt = '<svg onload=prompt()>\n第二行';
  question.options[0] = '<b onclick=answer()>答案</b>';
  question.explanationText = '<img src=x onerror=explain()>\n原始解說';
  const { dialog, controller, answer } = harness(t, [data]);
  controller.open('S01', 'Q01');
  answer('A');
  assert.match(dialog.title, /<img src=x onerror=title\(\)>/);
  assert.ok(dialog.content.textContent.includes(data.title));
  assert.ok(dialog.content.textContent.includes(question.prompt));
  assert.ok(dialog.content.textContent.includes(question.options[0]));
  assert.ok(dialog.content.textContent.includes(question.explanationText));
  for (const tag of ['script', 'img', 'svg', 'b'])
    assert.equal(byTag(dialog.content, tag).length, 0);
});

for (const text of [undefined, '', ' \n '])
  test(`optional blank explanation text ${JSON.stringify(text)} produces no empty text section`, (t) => {
    const data = unit();
    if (text === undefined) delete data.questions[0].explanationText;
    else data.questions[0].explanationText = text;
    delete data.questions[0].title;
    delete data.questions[0].prompt;
    const { dialog, controller, answer } = harness(t, [data]);
    controller.open('S01', 'Q01');
    answer('A');
    assert.equal(dialog.title, 'S01 · Q01');
    assert.equal(byClass(dialog.content, 'quiz-prompt').length, 0);
    assert.equal(byClass(dialog.content, 'quiz-explanation-text').length, 0);
    assert.equal(byClass(dialog.content, 'quiz-explanation-video').length, 1);
  });

test('submission without exactly one selection preserves progress and asks for one answer', (t) => {
  const { dialog, controller, sessions, answer, progress } = harness(t);
  controller.open('S01', 'Q01');
  assert.equal(answer(null).defaultPrevented, true);
  assert.equal(byClass(dialog.content, 'quiz-feedback')[0].dataset.result, 'missing');
  const radios = byTag(dialog.content, 'input');
  radios[0].checked = true;
  radios[1].checked = true;
  byClass(dialog.content, 'quiz-answer')[0].submit();
  assert.equal(sessions.get('S01').count, 0);
  assert.equal(progress.length, 0);
});

test('closing a modal prevents detached queued form submissions', (t) => {
  const { dialog, controller, sessions, progress } = harness(t);
  controller.open('S01', 'Q01');
  const old = byClass(dialog.content, 'quiz-answer')[0];
  byTag(old, 'input')[0].checked = true;
  dialog.close();
  old.submit();
  assert.equal(sessions.get('S01').count, 0);
  assert.equal(progress.length, 0);
  assert.equal(controller.snapshot().status, 'closed');
});

test('a newer Lecture/about modal owns the revision and cannot be changed by old Quiz events', (t) => {
  const { dialog, controller, sessions } = harness(t);
  controller.open('S01', 'Q01');
  const old = byClass(dialog.content, 'quiz-answer')[0];
  byTag(old, 'input')[0].checked = true;
  const latest = new FakeElement('div');
  dialog.showContent('Lecture', latest, {}, 'Lecture', { kind: 'lecture' });
  old.submit();
  assert.equal(dialog.content, latest);
  assert.equal(dialog.title, 'Lecture');
  assert.equal(sessions.get('S01').count, 0);
});

test('rapid close/reopen of the same question invalidates events from its earlier form', (t) => {
  const { dialog, controller, sessions, answer } = harness(t);
  controller.open('S01', 'Q01');
  const old = byClass(dialog.content, 'quiz-answer')[0];
  byTag(old, 'input')[0].checked = true;
  dialog.close();
  controller.open('S01', 'Q01');
  old.submit();
  assert.equal(sessions.get('S01').count, 0);
  answer('A');
  assert.equal(sessions.get('S01').count, 1);
});

test('feedback updates retain the same form, radios, links and scroll position', (t) => {
  const { dialog, controller, answer } = harness(t);
  controller.open('S01', 'Q01');
  const root = dialog.content,
    form = byClass(root, 'quiz-answer')[0],
    radios = byTag(root, 'input');
  const questionLink = byClass(root, 'quiz-question-video')[0];
  dialog.scrollTop = 317;
  answer('A');
  const explanationLink = byClass(root, 'quiz-explanation-video')[0];
  answer('B');
  assert.equal(dialog.content, root);
  assert.equal(byClass(root, 'quiz-answer')[0], form);
  assert.deepEqual(byTag(root, 'input'), radios);
  assert.equal(byClass(root, 'quiz-question-video')[0], questionLink);
  assert.equal(byClass(root, 'quiz-explanation-video')[0], explanationLink);
  assert.equal(dialog.scrollTop, 317);
});

test('Demo visibly identifies synthetic coursework while formal view omits that note', (t) => {
  const { dialog, controller } = harness(t, [unit()], true);
  controller.open('S01', 'Q01');
  assert.match(dialog.content.textContent, /本機示範資料.*並非正式課程教材/);
});
