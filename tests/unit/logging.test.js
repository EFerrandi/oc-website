import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import { requestLogging } from '../../src/middleware/logging.js';

function appWithLogging(options = {}) {
  const lines = { info: [], error: [] };
  const logger = {
    info: (line) => lines.info.push(line),
    error: (line) => lines.error.push(line),
    warn: () => {},
  };

  const app = express();
  app.use(requestLogging({ logger, ...options }));
  app.get('/ok', (req, res) => res.send('ok'));
  app.get('/boom', () => { throw new Error('deliberate failure'); });
  app.use((err, req, res, next) => res.status(500).send('error')); // eslint-disable-line no-unused-vars

  return { app, lines };
}

test('each request produces one structured line', async () => {
  const { app, lines } = appWithLogging();

  await request(app).get('/ok');

  assert.equal(lines.info.length, 1);
  const entry = JSON.parse(lines.info[0]);

  assert.equal(entry.method, 'GET');
  assert.equal(entry.path, '/ok');
  assert.equal(entry.status, 200);
  assert.equal(typeof entry.durationMs, 'number');
  assert.ok(!Number.isNaN(Date.parse(entry.time)), 'time is a valid timestamp');
});

/**
 * A log file routinely outlives the thing it describes. The NSFW opt-in
 * cookie and the admin password both travel in places that must never be
 * written down.
 */
test('nothing sensitive is ever written to the log', async () => {
  const { app, lines } = appWithLogging();

  await request(app)
    .get('/ok?tag=something-private&secret=leak')
    .set('Cookie', ['nsfw=1', 'sid=s%3Aadmin-session-id'])
    .set('Authorization', 'Bearer a-token');

  const line = lines.info[0];

  for (const secret of ['nsfw=1', 'admin-session-id', 'a-token', 'secret=leak', 'something-private']) {
    assert.ok(!line.includes(secret), `the log must not contain "${secret}"`);
  }

  assert.equal(JSON.parse(line).path, '/ok', 'the path is recorded without its query string');
});

test('server errors are logged at error level, everything else at info', async () => {
  const { app, lines } = appWithLogging();

  await request(app).get('/ok');
  await request(app).get('/nope');
  await request(app).get('/boom');

  assert.equal(lines.error.length, 1, 'only the 500 is an error');
  assert.equal(JSON.parse(lines.error[0]).status, 500);

  assert.equal(lines.info.length, 2, 'the 200 and the 404 are routine');
  assert.deepEqual(lines.info.map((l) => JSON.parse(l).status), [200, 404]);
});

test('logging can be switched off without affecting the response', async () => {
  const { app, lines } = appWithLogging({ enabled: false });

  const res = await request(app).get('/ok');

  assert.equal(res.status, 200);
  assert.equal(res.text, 'ok');
  assert.equal(lines.info.length, 0);
  assert.equal(lines.error.length, 0);
});
