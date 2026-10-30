import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLectureLoader,
  validateLecture,
  validateUnitId,
  validateYouTubeUrl,
} from '../src/lecture-data.js';

const video = (n = 1) => ({
  title: `影片 ${n}`,
  url: `https://youtu.be/TEST${String(n).padStart(7, '0')}`,
});
const lecture = (unitId = 'S01', count = 1) => ({
  unitId,
  title: `${unitId} Lecture`,
  videos: Array.from({ length: count }, (_, i) => video(i + 1)),
});
const manifest = (...ids) => ({
  schemaVersion: 1,
  units: ids.map((unitId) => ({ unitId, title: unitId, file: `${unitId}.json` })),
});
const loader = (fetchImpl, extra = {}) =>
  createLectureLoader({
    baseUrl: 'https://school.example/~teacher/lab/index.html',
    totalUnits: 15,
    manifest: manifest('S01', 'S02', 'S15'),
    fetchImpl,
    ...extra,
  });
const response = (data) => ({ ok: true, status: 200, json: async () => data });

test('Lecture accepts one, four, ten, many and empty videos while preserving all source strings and order', () => {
  for (const count of [0, 1, 4, 10, 37])
    assert.equal(validateLecture(lecture('S01', count), 'S01').videos.length, count);
  const source = lecture('S01', 4);
  source.title = '  教師指定標題  ';
  source.videos = [
    video(4),
    {
      title: '  English & 中文  ',
      url: 'HTTPS://WWW.YOUTUBE.COM/watch?v=abcdefghijk&t=40s#chapter',
    },
    video(1),
    video(4),
  ];
  const checked = validateLecture(source, 'S01');
  assert.deepEqual(checked, source);
  assert.notEqual(checked, source);
  assert.notEqual(checked.videos, source.videos);
  source.videos.reverse();
  assert.equal(checked.videos[0].title, '影片 4');
  assert.throws(() => checked.videos.push(video(9)), TypeError);
  assert.throws(() => {
    checked.videos[0].title = 'changed';
  }, TypeError);
});

test('unit IDs and requested identity reject path traversal, type confusion and course-range violations', () => {
  for (const id of ['S01', 'S12', 'S15']) assert.equal(validateUnitId(id), id);
  assert.equal(validateLecture(lecture('S15'), 'S15', 15).unitId, 'S15');
  for (const id of [
    'S00',
    'S16',
    'S1',
    's01',
    '../S01',
    'S01.json',
    'S01/../../secret',
    'S01%2f..',
    undefined,
    null,
    1,
  ])
    assert.throws(() => validateUnitId(id));
  for (const total of [0, 16, 1.1, '15', NaN]) assert.throws(() => validateUnitId('S01', total));
  assert.throws(() => validateLecture(lecture('S02'), 'S02', 1));
  assert.throws(() => validateLecture(lecture('S02'), 'S01'));
});

test('Lecture rejects malformed structures and invalid items without silently skipping or replacing them', () => {
  for (const value of [
    null,
    [],
    {},
    { ...lecture(), title: ' ' },
    { ...lecture(), videos: null },
    { ...lecture(), videos: {} },
    { ...lecture(), videos: [null] },
    { ...lecture(), videos: [{ title: ' ', url: video().url }] },
    { ...lecture(), videos: [{ title: 'x' }] },
    { ...lecture(), videos: [{ title: 'x', url: 'javascript:alert(1)' }] },
    { ...lecture(), videos: new Array(1) },
  ])
    assert.throws(() => validateLecture(value, 'S01'));
});

test('YouTube links retain valid watch/short URLs and timestamp parameters verbatim', () => {
  for (const url of [
    'https://youtu.be/abcdefghijk',
    'https://youtu.be/abcdefghijk?t=35#chapter',
    'https://youtube.com/watch?v=abcdefghijk',
    'https://www.youtube.com/watch?v=abcdefghijk&list=playlist&t=3s',
    'https://m.youtube.com/watch?v=abcdefghijk',
    'HTTPS://WWW.YOUTUBE.COM:443/watch?v=abcdefghijk',
  ])
    assert.equal(validateYouTubeUrl(url), url);
});

test('YouTube validation rejects executable schemes, lookalike authorities, repaired URLs and non-video destinations', () => {
  for (const url of [
    null,
    12,
    '',
    'javascript:alert(1)',
    'data:text/html,<script>',
    'http://youtube.com/watch?v=abcdefghijk',
    'https://youtube.com.evil.test/watch?v=abcdefghijk',
    'https://evil-youtube.com/watch?v=abcdefghijk',
    'https://youtube.com@evil.test/watch?v=abcdefghijk',
    'https://evil.test@youtube.com/watch?v=abcdefghijk',
    'https://user:pass@youtube.com/watch?v=abcdefghijk',
    'https://youtube.com:8443/watch?v=abcdefghijk',
    'https://youtube.com./watch?v=abcdefghijk',
    'https://%79outube.com/watch?v=abcdefghijk',
    'https://www.yοutube.com/watch?v=abcdefghijk',
    ' https://youtu.be/abcdefghijk',
    'https://youtu.be/abcdefghijk\n',
    'https:\\youtube.com/watch?v=abcdefghijk',
    'https://youtu.be/abcdefghijk/other',
    'https://youtu.be/abcdefghij',
    'https://youtube.com/redirect?q=https://evil.test',
    'https://youtube.com/embed/abcdefghijk',
    'https://youtube.com/watch?v=abcdefghijk&v=12345678901',
    'https://youtube.com/watch?v=short',
    'https://youtube.com/watch?other=abcdefghijk',
  ])
    assert.throws(() => validateYouTubeUrl(url), String(url));
});

test('fixed relative Lecture requests work from root, Apache directory and index.html', async () => {
  for (const baseUrl of [
    'https://school.example/',
    'https://school.example/~teacher/lab/',
    'https://school.example/~teacher/lab/index.html',
  ]) {
    const calls = [];
    const data = loader(
      async (url) => {
        calls.push(String(url));
        return response(lecture());
      },
      { baseUrl },
    );
    await data.load('S01');
    assert.deepEqual(calls, [new URL('./course-videos/S01.json', baseUrl).href]);
  }
});

test('locked and illegal units never invoke any data source, including after a success is cached', async () => {
  const open = manifest('S01');
  let calls = 0;
  const data = loader(
    async () => {
      calls++;
      return response(lecture());
    },
    { manifest: open },
  );
  for (const id of ['S02', 'S15', '../S01']) await assert.rejects(data.load(id));
  assert.equal(calls, 0);
  await data.load('S01');
  await data.load('S01');
  assert.equal(calls, 1);
  open.units.push(...manifest('S02').units);
  await assert.rejects(data.load('S02'), (error) => error.code === 'LOCKED');
  assert.equal(calls, 1, 'mutating the caller manifest cannot silently publish a unit');
  assert.throws(() =>
    loader(async () => response(lecture()), {
      manifest: {
        schemaVersion: 1,
        units: [{ unitId: 'S01', title: 'x', file: '../secret.json' }],
      },
    }),
  );
});

test('concurrent readers share one validated immutable result, and clearCache reloads', async () => {
  let release,
    calls = 0;
  const data = loader(() => {
    calls++;
    return new Promise((resolve) => {
      release = () => resolve(response(lecture()));
    });
  });
  const a = data.load('S01'),
    b = data.load('S01');
  assert.equal(calls, 1);
  release();
  const [x, y] = await Promise.all([a, b]);
  assert.equal(x, y);
  assert.equal(await data.load('S01'), x);
  data.clearCache();
  const c = data.load('S01');
  assert.equal(calls, 2);
  release();
  assert.notEqual(await c, x);
});

test('a cache clear during a delayed request cannot overwrite the newer generation', async () => {
  let finishFirst,
    calls = 0;
  const data = loader(() => {
    calls++;
    return calls === 1
      ? new Promise((resolve) => {
          finishFirst = () => resolve(response({ ...lecture(), title: 'old' }));
        })
      : Promise.resolve(response({ ...lecture(), title: 'new' }));
  });
  const old = data.load('S01');
  data.clearCache();
  assert.equal((await data.load('S01')).title, 'new');
  finishFirst();
  assert.equal((await old).title, 'old');
  assert.equal((await data.load('S01')).title, 'new');
  assert.equal(calls, 2);
});

test('HTTP, JSON, network and schema failures are explicit, do not cache, and allow retry', async () => {
  const faults = [
    [async () => ({ ok: false, status: 404 }), 'HTTP', /S01.*404/],
    [
      async () => ({
        ok: true,
        json: async () => {
          throw new SyntaxError();
        },
      }),
      'JSON',
      /S01.*JSON/,
    ],
    [
      async () => {
        throw new Error('offline');
      },
      'NETWORK',
      /S01.*載入失敗/,
    ],
    [async () => response(lecture('S02')), 'INVALID', /S01.*編號不符/],
  ];
  for (const [fault, code, message] of faults) {
    let calls = 0;
    const data = loader(async (url) => {
      calls++;
      return calls === 1 ? fault(url) : response(lecture());
    });
    await assert.rejects(data.load('S01'), (e) => e.code === code && message.test(e.message));
    assert.equal((await data.load('S01')).unitId, 'S01');
    assert.equal(calls, 2);
  }
});

test('isolated Demo callbacks use the same gate/validator/cache without a network request', async () => {
  let reads = 0,
    fetches = 0;
  const data = loader(
    () => {
      fetches++;
      throw new Error('network forbidden');
    },
    {
      readDemo: async (id) => {
        reads++;
        return lecture(id, 4);
      },
    },
  );
  assert.equal((await data.load('S02')).videos.length, 4);
  await data.load('S02');
  await assert.rejects(data.load('S03'), (e) => e.code === 'LOCKED');
  assert.equal(reads, 1);
  assert.equal(fetches, 0);
  const failure = loader(() => {}, {
    readDemo: async () => {
      throw Object.assign(new Error('示例不存在（HTTP 404）'), { code: 'HTTP' });
    },
  });
  await assert.rejects(failure.load('S01'), (e) => e.code === 'HTTP' && /404/.test(e.message));
  const broken = loader(() => {}, { readDemo: async () => JSON.parse('{') });
  await assert.rejects(broken.load('S01'), (e) => e.code === 'JSON' && /JSON/.test(e.message));
});
