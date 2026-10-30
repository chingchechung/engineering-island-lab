import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  normalizeUnit,
  normalizeManifest,
  validateUnit,
  validateUnitV1,
  validateUnitV2,
  validateManifest,
  acceptsAnswer,
  validateOrThrow,
} from '../src/quiz-contract.js';
import { checkCorpus, legacyRules } from '../scripts/legacy-parity.mjs';

const reference = new URL('./fixtures/legacy/reference/', import.meta.url);
const fixture = (name = 'S01.json', version = 1) =>
  JSON.parse(
    readFileSync(new URL(`tests/fixtures/${version === 2 ? 'v2/' : ''}${name}`, reference), 'utf8'),
  );
const manifestFor = (ids) => ({
  schemaVersion: 1,
  units: ids.map((unitId) => ({
    unitId,
    title: `Unit ${unitId}`,
    file: `${unitId}.json`,
  })),
});

test('all 364 pinned validation cases and 76 answer selections preserve legacy semantics', () => {
  const corpus = JSON.parse(
    readFileSync(new URL('./fixtures/legacy/corpus.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(checkCorpus(corpus), {
    validationCases: 364,
    answerSelections: 76,
    changedErrors: 11,
    changedValidity: 0,
  });
});

test('14 pinned reference files retain original SHA256 bytes and exact URL rules', () => {
  const inventory = JSON.parse(
    readFileSync(new URL('./fixtures/legacy/source-files.json', import.meta.url), 'utf8'),
  );
  assert.equal(inventory.files.length, 14);
  for (const entry of inventory.files) {
    const bytes = readFileSync(new URL(entry.file, reference));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
  assert.deepEqual(
    readFileSync(new URL('../src/legacy-assignment/assignment-rules.js', import.meta.url)),
    readFileSync(new URL('js/assignment-rules.js', reference)),
  );
  const originalValidator = readFileSync(new URL('js/assignment-validator.js', reference), 'utf8');
  assert.equal(
    readFileSync(
      new URL('../src/legacy-assignment/assignment-validator.js', import.meta.url),
      'utf8',
    ),
    originalValidator
      .replaceAll('1[0-2]', '1[0-5]')
      .replaceAll('S01 through S12', 'S01 through S15')
      .replaceAll('data.units.length > 12', 'data.units.length > 15')
      .replaceAll('At most 12 units', 'At most 15 units'),
    'No validator algorithm changes beyond the four range replacements',
  );
  for (const version of [1, 2]) {
    const schema = JSON.parse(
      readFileSync(
        new URL(`../schemas/assignment-v${version}.schema.json`, import.meta.url),
        'utf8',
      ),
    );
    for (const key of ['youtubeUrl', 'googleFormUrl'])
      assert.equal(schema.$defs[key].pattern, legacyRules[key]);
    const originalSchema = JSON.parse(
      readFileSync(new URL(`schemas/assignment-v${version}.schema.json`, reference), 'utf8'),
    );
    originalSchema.properties.unitId.pattern = originalSchema.properties.unitId.pattern.replace(
      '1[0-2]',
      '1[0-5]',
    );
    assert.deepEqual(schema, originalSchema, 'No assignment Schema changes beyond S15');
  }
});

for (const version of [1, 2]) {
  for (const [filename, count] of [
    ['S01.json', 4],
    ['S02.json', 5],
  ]) {
    test(`v${version} accepts the exact original ${count}-question synthetic assignment`, () => {
      const data = fixture(filename, version),
        before = structuredClone(data);
      assert.deepEqual(validateUnit(data, filename), []);
      assert.deepEqual((version === 1 ? validateUnitV1 : validateUnitV2)(data, filename), []);
      assert.equal(data.questions.length, count);
      assert.deepEqual(data, before);
    });
  }
  test(`v${version} accepts matching S12–S15 filenames and rejects S16`, () => {
    for (const number of [12, 13, 14, 15]) {
      const data = fixture('S01.json', version);
      data.unitId = `S${number}`;
      assert.deepEqual(validateUnit(data, `${data.unitId}.json`), []);
      assert.ok(validateUnit(data, 'S01.json').some((issue) => issue.code === 'filename'));
    }
    const invalid = fixture('S01.json', version);
    invalid.unitId = 'S16';
    assert.ok(validateUnit(invalid, 'S16.json').some((issue) => issue.code === 'unit_id'));
  });
}

test('v2 keeps three options and accepts either A or C as one selection', () => {
  const unit = fixture('S01.json', 2),
    question = unit.questions[0];
  question.correctOptions = ['A', 'C'];
  assert.deepEqual(validateUnitV2(unit, 'S01.json'), []);
  assert.equal(question.options.length, 3);
  assert.equal(acceptsAnswer(question, 'A'), true);
  assert.equal(acceptsAnswer(question, 'C'), true);
  for (const answer of ['B', 'D', 'E', ['A', 'C'], 'AC', ' A ', null])
    assert.equal(acceptsAnswer(question, answer), false);
  question.correctOptions = ['A', 'A'];
  assert.equal(acceptsAnswer(question, 'A'), false);
  question.correctOptions = ['D'];
  assert.equal(acceptsAnswer(question, 'D'), false);
});

test('required explanation URL remains required even though watching is optional', () => {
  for (const version of [1, 2]) {
    const unit = fixture('S01.json', version);
    delete unit.questions[0].explanationVideoUrl;
    assert.ok(
      validateUnit(unit).some(
        (issue) => issue.path.endsWith('.explanationVideoUrl') && issue.code === 'required',
      ),
    );
  }
});

test('unknown metadata, nonsequential IDs and mixed answer fields are rejected', () => {
  const v1 = fixture(),
    v2 = fixture('S01.json', 2);
  v1.questions[0].correctOptions = ['A'];
  v2.questions[0].correctOption = 'A';
  for (const unit of [v1, v2])
    assert.ok(validateUnit(unit).some((issue) => issue.code === 'unknown_field'));
  const invalid = fixture();
  invalid.questions[1].id = 'Q01';
  assert.ok(validateUnit(invalid).some((issue) => issue.code === 'question_id'));
  invalid.questions[1].id = 'Q02';
  invalid.allowPlay = true;
  assert.ok(validateUnit(invalid).some((issue) => issue.path === '$.allowPlay'));
});

test('normalization trims ordinary text while IDs, answers and original choice order remain exact', () => {
  const data = fixture('S01.json', 2),
    before = structuredClone(data);
  data.title = ' \ufeff 課程 \n';
  data.questions[0].options = [' 第二 ', ' 第一 ', ' third '];
  data.questions[0].prompt = ' \n <img src=x onerror=alert(1)> \n';
  data.questions[0].correctOptions = [' A '];
  const normalized = normalizeUnit(data);
  assert.equal(normalized.title, '課程');
  assert.deepEqual(normalized.questions[0].options, ['第二', '第一', 'third']);
  assert.equal(normalized.questions[0].prompt, '<img src=x onerror=alert(1)>');
  assert.deepEqual(normalized.questions[0].correctOptions, [' A ']);
  assert.equal(data.questions[0].options[0], ' 第二 ');
  normalized.questions[1].options[0] = 'independent';
  assert.equal(data.questions[1].options[0], before.questions[1].options[0]);
  const manifest = manifestFor(['S13']);
  manifest.units[0].title = ' \ufeff Unit 13 \n';
  assert.equal(normalizeManifest(manifest).units[0].title, 'Unit 13');
  assert.equal(manifest.units[0].title, ' \ufeff Unit 13 \n');
});

test('Manifest v1 extends only the allowlist ceiling and exact matching filenames to 15', () => {
  const ids = Array.from({ length: 15 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
  assert.deepEqual(validateManifest(manifestFor(ids)), []);
  assert.deepEqual(validateManifest({ schemaVersion: 1, units: [] }), []);
  const duplicate = manifestFor([...ids, 'S15']);
  assert.ok(validateManifest(duplicate).some((issue) => issue.code === 'unit_count'));
  assert.ok(validateManifest(duplicate).some((issue) => issue.code === 'duplicate_unit'));
  for (const file of [
    '../S13.json',
    'sub/S13.json',
    'https://evil.test/S13.json',
    'S13.json?x',
    'S13.json#x',
    'S13.JSON',
  ]) {
    const invalid = manifestFor(['S13']);
    invalid.units[0].file = file;
    assert.ok(
      validateManifest(invalid).some((issue) => issue.code === 'filename'),
      file,
    );
  }
});

test('validateOrThrow preserves the full ordered issue list beyond its short summary', () => {
  const issues = validateUnit({});
  assert.ok(issues.length > 3);
  assert.throws(
    () => validateOrThrow(issues, 'S01.json'),
    (error) => {
      assert.equal(error.issues, issues);
      assert.match(error.message, /^S01.json failed validation:/);
      return true;
    },
  );
  assert.equal(validateOrThrow([], 'S01.json'), undefined);
});
