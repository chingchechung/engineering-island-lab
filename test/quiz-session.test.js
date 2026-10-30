import assert from 'node:assert/strict';
import test from 'node:test';
import { createQuizSessions } from '../src/quiz-session.js';

// Locally generated synthetic content only; these URLs are never visited.
function unit(unitId = 'S01', version = 1, count = 4) {
  return {
    schemaVersion: version,
    unitId,
    title: ` ${unitId} test `,
    googleFormUrl: ` https://forms.gle/Island${unitId}Test42 `,
    questions: Array.from({ length: count }, (_, index) => ({
      id: `Q${String(index + 1).padStart(2, '0')}`,
      title: ` 題目${index + 1} `,
      prompt: ' 題目說明\n <b>literal</b> ',
      questionVideoUrl: 'https://youtu.be/TEST1234567',
      explanationVideoUrl: 'https://youtu.be/EXPL1234567',
      explanationText: ' 原始解說 ',
      options: version === 1 ? ['A1', 'B2', 'C3', 'D4'] : ['A1', 'B2', 'C3'],
      ...(version === 1 ? { correctOption: 'A' } : { correctOptions: ['A', 'C'] }),
    })),
  };
}

test('sessions accept v1/v2 four/five exports with S12–S15, keep original versions and normalized text', () => {
  for (const version of [1, 2])
    for (const count of [4, 5])
      for (const unitId of ['S12', 'S13', 'S14', 'S15']) {
        const sessions = createQuizSessions();
        const session = sessions.activate(unit(unitId, version, count));
        assert.equal(session.unit.schemaVersion, version);
        assert.equal(session.total, count);
        assert.equal(session.count, 0);
        assert.equal(session.complete, false);
        assert.equal(session.unit.title, `${unitId} test`);
        assert.equal(session.question('Q01').prompt, '題目說明\n <b>literal</b>');
        assert.equal(session.questions[0].options.length, version === 1 ? 4 : 3);
        assert.equal(session.question(count === 4 ? 'Q05' : 'Q06'), null);
        assert.equal(sessions.get(unitId), session);
      }
});

test('wrong answers retry without deleting earlier passes, and completed wrong reviews keep explanations/Form unlocked', () => {
  const sessions = createQuizSessions();
  const session = sessions.activate(unit());
  assert.equal(session.answer('Q01', 'B'), false);
  assert.equal(session.count, 0);
  assert.equal(session.answer('Q01', 'A'), true);
  assert.equal(session.hasPassed('Q01'), true);
  assert.equal(session.answer('Q02', 'B'), false);
  assert.equal(session.count, 1);
  assert.equal(session.answer('Q01', 'D'), false);
  assert.equal(session.hasPassed('Q01'), true);
  for (const id of ['Q02', 'Q03', 'Q04']) assert.equal(session.answer(id, 'A'), true);
  assert.equal(session.complete, true);
  assert.equal(session.answer('Q01', 'B'), false);
  assert.equal(session.count, 4);
  assert.equal(session.snapshot().formUrl, 'https://forms.gle/IslandS01Test42');
});

test('v2 accepts one A or C, rejects B/absent D, and never treats an array as a valid selection', () => {
  const session = createQuizSessions().activate(unit('S01', 2));
  assert.equal(session.answer('Q01', ['A', 'C']), false);
  assert.equal(session.answer('Q01', 'B'), false);
  assert.equal(session.answer('Q01', 'D'), false);
  assert.equal(session.answer('Q01', 'A'), true);
  assert.equal(session.answer('Q02', 'C'), true);
  assert.equal(session.count, 2);
  assert.equal(session.question('Q01').options.length, 3);
});

test('completion exactly follows four/five real questions; 3/4 and 4/5 do not expose a Form', () => {
  for (const count of [4, 5]) {
    const session = createQuizSessions().activate(unit('S01', 2, count));
    for (const question of session.questions.slice(0, -1)) session.answer(question.id, 'C');
    assert.equal(session.count, count - 1);
    assert.equal(session.snapshot().formUrl, null);
    assert.equal(session.complete, false);
    session.answer(`Q0${count}`, 'A');
    assert.equal(session.complete, true);
    assert.equal(session.count, count);
    assert.equal(session.snapshot().formUrl, session.unit.googleFormUrl);
  }
});

test('multiple island sessions and mixed counts remain independent, ordered by each unit question list', () => {
  const sessions = createQuizSessions();
  const s01 = sessions.activate(unit('S01', 1, 4));
  const s02 = sessions.activate(unit('S02', 2, 5));
  for (const q of s01.questions) s01.answer(q.id, 'A');
  s02.answer('Q04', 'C');
  s02.answer('Q01', 'C');
  assert.equal(s01.complete, true);
  assert.equal(s02.count, 2);
  assert.equal(s02.complete, false);
  assert.deepEqual(s02.snapshot().passedIds, ['Q01', 'Q04']);
  assert.equal(sessions.get('S03'), null);
  assert.deepEqual(
    sessions.snapshot().map((s) => [s.unitId, s.count, s.total]),
    [
      ['S01', 4, 4],
      ['S02', 2, 5],
    ],
  );
});

test('invalid qids and labels cannot create passes or progress beyond the required count', () => {
  const session = createQuizSessions().activate(unit());
  for (const id of ['Q00', 'Q05', 'q01', 'Q01\n', null, undefined])
    assert.equal(session.answer(id, 'A'), false);
  for (const choice of [null, undefined, {}, ['A'], 'a', ' A ', 'AB', 'E'])
    assert.equal(session.answer('Q01', choice), false);
  assert.equal(session.count, 0);
  for (let i = 0; i < 10; i++) session.answer('Q01', 'A');
  assert.equal(session.count, 1);
});

test('session data is a deep immutable normalized copy and snapshots cannot mutate private passed sets', () => {
  const source = unit();
  const session = createQuizSessions().activate(source);
  source.questions.reverse();
  source.googleFormUrl = 'https://forms.gle/AnotherUnit';
  assert.equal(session.question('Q01').title, '題目1');
  assert.equal(session.questions[0].id, 'Q01');
  assert.throws(() => session.questions.push({}), TypeError);
  assert.throws(() => {
    session.questions[0].correctOption = 'B';
  }, TypeError);
  session.answer('Q01', 'A');
  assert.throws(() => session.snapshot().passedIds.push('Q02'), TypeError);
  assert.equal(session.count, 1);
});

test('same normalized export activation preserves progress even when object properties have different insertion order', () => {
  const sessions = createQuizSessions();
  const source = unit();
  const session = sessions.activate(source);
  session.answer('Q01', 'A');
  const reordered = Object.fromEntries(Object.entries(structuredClone(source)).reverse());
  reordered.title = 'S01 test';
  assert.equal(sessions.activate(reordered), session);
  assert.equal(session.count, 1);
});

test('different content for an active unit is rejected without replacing or resetting an attempt', () => {
  const sessions = createQuizSessions();
  const source = unit();
  const session = sessions.activate(source);
  session.answer('Q01', 'A');
  const changed = structuredClone(source);
  changed.questions[0].prompt = 'A new exercise';
  assert.throws(() => sessions.activate(changed), /S01.*重新整理/);
  assert.equal(sessions.get('S01'), session);
  assert.equal(session.count, 1);
  assert.equal(session.question('Q01').prompt, '題目說明\n <b>literal</b>');
});

test('failed activation does not affect other islands or admit unvalidated units; new page state starts empty', () => {
  const sessions = createQuizSessions();
  const s01 = sessions.activate(unit());
  s01.answer('Q01', 'A');
  const broken = unit('S02', 2, 5);
  delete broken.questions[0].explanationVideoUrl;
  assert.throws(
    () => sessions.activate(broken),
    (e) => e.issues?.length > 0,
  );
  assert.equal(sessions.get('S02'), null);
  assert.equal(sessions.get('S01').count, 1);
  const freshPage = createQuizSessions();
  assert.equal(freshPage.snapshot().length, 0);
  assert.equal(freshPage.activate(unit()).count, 0);
});
