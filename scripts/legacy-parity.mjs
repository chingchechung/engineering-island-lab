// Synthetic contract parity only. No fetches, coursework or persistence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import * as island from '../src/quiz-contract.js';

export const referenceDirectory = new URL('../test/fixtures/legacy/reference/', import.meta.url);
const read = (path) => readFileSync(new URL(path, referenceDirectory), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const ruleModule = { exports: {} };
runInNewContext(read('js/assignment-rules.js'), { module: ruleModule });
export const legacyRules = plain(ruleModule.exports);
const validatorModule = { exports: {} };
runInNewContext(read('js/assignment-validator.js'), {
  module: validatorModule,
  require: (path) => {
    assert.equal(path, './assignment-rules.js');
    return legacyRules;
  },
});
export const legacy = validatorModule.exports;

export function evaluate(validator, { cases, answers }) {
  return plain({
    results: cases.map((item) => ({
      errors:
        item.kind === 'unit'
          ? validator.validateUnit(item.data, item.filename ?? null)
          : validator.validateManifest(item.data),
      normalized:
        item.kind === 'unit'
          ? validator.normalizeUnit(item.data)
          : validator.normalizeManifest(item.data),
    })),
    answers: answers.map((item) => validator.acceptsAnswer(item.question, item.selected)),
  });
}

// These are the complete permitted differences, rather than a broad error skip.
export function extendLimitErrors(item, errors) {
  return errors.flatMap((error) => {
    if (error.code === 'unit_id') {
      const index = /^\$\.units\[(\d+)\]\.unitId$/.exec(error.path)?.[1];
      const id = index === undefined ? item.data?.unitId : item.data?.units?.[index]?.unitId;
      if (['S13', 'S14', 'S15'].includes(id)) return [];
    }
    if (error.code === 'unit_count' && item.data?.units?.length <= 15) return [];
    return [
      {
        ...error,
        message: error.message
          .replace('Expected S01 through S12.', 'Expected S01 through S15.')
          .replace('At most 12 units are allowed.', 'At most 15 units are allowed.'),
      },
    ];
  });
}

export function checkCorpus(payload) {
  const original = evaluate(legacy, payload);
  const ported = evaluate(island, payload);
  let changedErrors = 0;
  let changedValidity = 0;
  payload.cases.forEach((item, index) => {
    const before = original.results[index];
    const after = ported.results[index];
    assert.equal(before.errors.length === 0, item.valid, `Legacy acceptance: ${item.name}`);
    assert.deepEqual(after.normalized, before.normalized, `Normalization: ${item.name}`);
    assert.deepEqual(
      after.errors,
      extendLimitErrors(item, before.errors),
      `Ordered errors: ${item.name}`,
    );
    if (JSON.stringify(after.errors) !== JSON.stringify(before.errors)) changedErrors++;
    if ((after.errors.length === 0) !== (before.errors.length === 0)) changedValidity++;
  });
  const expected = payload.answers.map((item) => item.expected);
  assert.deepEqual(original.answers, expected, 'Original answer selections');
  assert.deepEqual(ported.answers, expected, 'Island single-choice answer selections');
  return {
    validationCases: payload.cases.length,
    answerSelections: payload.answers.length,
    changedErrors,
    changedValidity,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--stdin')) {
    const payload = JSON.parse(readFileSync(0, 'utf8'));
    process.stdout.write(
      JSON.stringify({
        rules: legacyRules,
        original: evaluate(legacy, payload),
        island: evaluate(island, payload),
        summary: checkCorpus(payload),
      }),
    );
  } else {
    const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
    process.stdout.write(
      execFileSync(python, [fileURLToPath(new URL('./legacy-parity.py', import.meta.url))], {
        encoding: 'utf8',
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
      }),
    );
  }
}
