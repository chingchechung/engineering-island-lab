import assert from 'node:assert/strict';
import test from 'node:test';
import { createQuizLoader, QuizDataError } from '../src/quiz-data.js';

// Synthetic test-only exports; never published or navigated to by these tests.
function unit(unitId = 'S01', version = 1, count = 4) {
  return {
    schemaVersion: version,
    unitId,
    title: ` ${unitId} synthetic `,
    googleFormUrl: ' https://forms.gle/IslandTestAlpha42 ',
    questions: Array.from({ length: count }, (_, index) => ({
      id: `Q${String(index + 1).padStart(2, '0')}`,
      title: ` Test question ${index + 1} `,
      questionVideoUrl: ' https://youtu.be/TEST1234567?t=4 ',
      explanationVideoUrl: ' https://youtube.com/watch?v=EXPL1234567 ',
      options:
        version === 1
          ? [' A option ', ' B option ', ' C option ', ' D option ']
          : [' A option ', ' B option ', ' C option '],
      ...(version === 1 ? { correctOption: 'A' } : { correctOptions: ['A', 'C'] }),
    })),
  };
}
const manifest = (...ids) => ({
  schemaVersion: 1,
  units: ids.map((unitId) => ({ unitId, title: ` ${unitId} synthetic `, file: `${unitId}.json` })),
});
const response = (value) => ({ ok: true, status: 200, json: async () => value });
const loader = (fetchImpl, extra = {}) =>
  createQuizLoader({
    baseUrl: 'https://school.example/~teacher/island/index.html',
    totalUnits: 15,
    manifest: manifest('S01', 'S02', 'S15'),
    fetchImpl,
    ...extra,
  });
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('Quiz loader validates the exact legacy manifest and rejects illegal course boundaries before any request', () => {
  for (const totalUnits of [0, 16, 1.5, '15', NaN])
    assert.throws(
      () => loader(() => {}, { totalUnits }),
      (e) => e.code === 'INVALID',
    );
  const badManifests = [
    null,
    { schemaVersion: 2, units: [] },
    { schemaVersion: 1, units: [], unexpected: true },
    { schemaVersion: 1, units: [{ unitId: 'S01', title: 'x', file: '../S01.json' }] },
    { schemaVersion: 1, units: [{ unitId: 'S01', title: 'x', file: 'S01.json', other: true }] },
    manifest('S01', 'S01'),
    manifest('S16'),
  ];
  for (const candidate of badManifests)
    assert.throws(
      () => loader(() => {}, { manifest: candidate }),
      (e) => e instanceof QuizDataError && e.code === 'INVALID' && e.issues.length > 0,
    );
  assert.throws(
    () => loader(() => {}, { totalUnits: 12 }),
    (e) => e.code === 'INVALID',
  );
});

test('Quiz allowlist and exact unit IDs gate cache and fetch; caller mutation cannot publish another unit', async () => {
  const source = manifest('S01');
  let calls = 0;
  const data = loader(
    async () => {
      calls++;
      return response(unit());
    },
    { manifest: source },
  );
  for (const id of [
    'S02',
    'S15',
    'S00',
    'S16',
    '../S01',
    'S01.json',
    'S01\n',
    ' S01',
    's01',
    1,
    null,
    undefined,
  ])
    await assert.rejects(data.load(id), (e) => ['LOCKED', 'INVALID'].includes(e.code));
  assert.equal(calls, 0);
  await data.load('S01');
  await data.load('S01');
  source.units.push(...manifest('S02').units);
  source.units[0].title = 'Mutated caller title';
  await assert.rejects(data.load('S02'), (e) => e.code === 'LOCKED');
  assert.equal((await data.load('S01')).title, 'S01 synthetic');
  assert.equal(calls, 1);
});

test('Quiz fixed paths support Apache root, nested directory and index.html with no-store/no redirects', async () => {
  for (const baseUrl of [
    'https://school.example/',
    'https://school.example/~teacher/island/',
    'https://school.example/~teacher/island/index.html',
  ]) {
    const calls = [];
    const data = loader(
      async (url, options) => {
        calls.push({ url: String(url), options });
        return response(unit('S15', 2, 5));
      },
      { baseUrl },
    );
    const checked = await data.load('S15');
    assert.equal(checked.questions.length, 5);
    assert.equal(calls[0].url, new URL('./assignments/S15.json', baseUrl).href);
    assert.equal(calls[0].options.cache, 'no-store');
    assert.equal(calls[0].options.redirect, 'error');
    assert.ok(calls[0].options.signal instanceof AbortSignal);
  }
});

test('Quiz validates exact filename/unit identity, required URLs and normalized manifest title before returning data', async () => {
  const faults = [
    unit('S02'),
    { ...unit(), title: 'Unrelated title' },
    { ...unit(), googleFormUrl: 'https://forms.gle/PLACEHOLDER' },
    {
      ...unit(),
      questions: unit().questions.map((q, i) => (i ? q : { ...q, explanationVideoUrl: undefined })),
    },
  ];
  for (const value of faults) {
    const data = loader(async () => response(value));
    await assert.rejects(
      data.load('S01'),
      (error) =>
        error.code === 'INVALID' &&
        error.issues.length > 0 &&
        error.issues.every((issue) => issue.path && issue.code && issue.message),
    );
  }
});

test('Quiz concurrent readers share an immutable normalized result while different units remain independent', async () => {
  const waits = new Map([
    ['S01', deferred()],
    ['S02', deferred()],
  ]);
  const calls = [];
  const data = loader((url) => {
    const id = /S\d\d/.exec(String(url))[0];
    calls.push(id);
    return waits.get(id).promise;
  });
  const a = data.load('S01'),
    b = data.load('S01'),
    other = data.load('S02');
  await tick();
  assert.deepEqual(calls, ['S01', 'S02']);
  const original = unit('S02', 2, 5);
  waits.get('S02').resolve(response(original));
  const second = await other;
  assert.equal(second.questions.length, 5);
  assert.equal(second.questions[0].options.length, 3);
  assert.deepEqual(second.questions[0].correctOptions, ['A', 'C']);
  assert.equal(second.questions[0].title, 'Test question 1');
  assert.equal(second.questions[0].questionVideoUrl, 'https://youtu.be/TEST1234567?t=4');
  original.questions.reverse();
  assert.equal(second.questions[0].id, 'Q01');
  assert.throws(() => second.questions[0].options.push('D'), TypeError);
  waits.get('S01').resolve(response(unit()));
  const [first, duplicate] = await Promise.all([a, b]);
  assert.equal(first, duplicate);
  assert.equal(await data.load('S01'), first);
  assert.equal(calls.length, 2);
});

test('Quiz HTTP/JSON/network/validation failures are clear, never cached and can retry independently', async () => {
  const faults = [
    [async () => ({ ok: false, status: 404 }), 'HTTP', /S01.*404/],
    [
      async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError('broken');
        },
      }),
      'JSON',
      /S01.*JSON/,
    ],
    [
      async () => {
        throw new TypeError('offline');
      },
      'NETWORK',
      /S01.*載入失敗/,
    ],
    [async () => response({ ...unit(), title: 'mismatch' }), 'INVALID', /S01.*驗證失敗/],
  ];
  for (const [fault, code, message] of faults) {
    let calls = 0;
    const data = loader(async () => (++calls === 1 ? fault() : response(unit())));
    await assert.rejects(data.load('S01'), (e) => e.code === code && message.test(e.message));
    assert.equal((await data.load('S01')).unitId, 'S01');
    assert.equal(calls, 2);
  }
});

test('cancel rejects a pending unit even when its source ignores abort and never pollutes another unit', async () => {
  const wait = deferred();
  let signal;
  const data = loader(async (url, options) => {
    if (String(url).includes('S01')) {
      signal = options.signal;
      return wait.promise;
    }
    return response(unit('S02', 2, 5));
  });
  const first = data.load('S01');
  const rejected = assert.rejects(first, (e) => e.code === 'CANCELLED');
  await tick();
  data.cancel('S01');
  assert.equal(signal.aborted, true);
  await rejected;
  assert.equal((await data.load('S02')).unitId, 'S02');
  wait.resolve(response(unit()));
  await tick();
});

test('clearCache cancels old generations; delayed old reads cannot resolve successfully or replace new cache', async () => {
  const oldResponse = deferred();
  let calls = 0;
  const data = loader(async () => {
    calls++;
    return calls === 1
      ? oldResponse.promise
      : response({
          ...unit(),
          questions: unit().questions.map((q) => ({ ...q, prompt: 'new export' })),
        });
  });
  const old = data.load('S01');
  const rejected = assert.rejects(old, (e) => e.code === 'CANCELLED');
  await tick();
  data.clearCache();
  const fresh = await data.load('S01');
  await rejected;
  oldResponse.resolve(response(unit()));
  await tick();
  assert.equal(await data.load('S01'), fresh);
  assert.equal(fresh.questions[0].prompt, 'new export');
  assert.equal(calls, 2);
});

test('cancel all works across concurrent units and same-turn cancellation does not start a request', async () => {
  let calls = 0;
  const data = loader(async () => {
    calls++;
    return new Promise(() => {});
  });
  const a = data.load('S01'),
    b = data.load('S02');
  const denied = Promise.all([
    assert.rejects(a, { code: 'CANCELLED' }),
    assert.rejects(b, { code: 'CANCELLED' }),
  ]);
  data.cancel();
  await denied;
  assert.equal(calls, 0);
});

test('hung sources time out at 15 seconds even if fetch ignores abort, then permit retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const data = loader(async () => (++calls === 1 ? new Promise(() => {}) : response(unit())));
  const first = data.load('S01');
  const rejected = assert.rejects(first, (e) => e.code === 'NETWORK' && /逾時/.test(e.message));
  await tick();
  t.mock.timers.tick(15_000);
  await rejected;
  assert.equal((await data.load('S01')).unitId, 'S01');
  assert.equal(calls, 2);
});

test('isolated Demo reads use the same validation, gate and cache without any network or storage', async () => {
  let fetches = 0,
    reads = 0;
  const data = loader(
    async () => {
      fetches++;
      throw new Error('unexpected request');
    },
    {
      readDemo: async (id, { signal }) => {
        reads++;
        assert.equal(signal.aborted, false);
        return unit(id, 2, 5);
      },
    },
  );
  assert.equal((await data.load('S02')).questions.length, 5);
  await data.load('S02');
  await assert.rejects(data.load('S03'), { code: 'LOCKED' });
  assert.equal(fetches, 0);
  assert.equal(reads, 1);
  const invalidData = loader(() => {}, {
    readDemo: async () => ({ ...unit(), googleFormUrl: 'javascript:alert(1)' }),
  });
  await assert.rejects(invalidData.load('S01'), { code: 'INVALID' });
  const broken = loader(() => {}, { readDemo: async () => JSON.parse('{') });
  await assert.rejects(broken.load('S01'), { code: 'JSON' });
  const missing = loader(() => {}, {
    readDemo: async () => {
      throw Object.assign(new Error('測試題庫不存在（HTTP 404）'), { code: 'HTTP' });
    },
  });
  await assert.rejects(missing.load('S01'), (e) => e.code === 'HTTP' && /404/.test(e.message));
});
