import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConfig } from '../../src/config.js';

const VALID = {
  SESSION_SECRET: 'a-long-enough-session-secret',
  ADMIN_PASSWORD_HASH: 'scrypt$aaaa$bbbb',
};

test('a missing required value fails immediately and names the key', () => {
  assert.throws(
    () => loadConfig({}),
    (err) => {
      assert.match(err.message, /SESSION_SECRET/, 'names the missing secret');
      assert.match(err.message, /ADMIN_PASSWORD_HASH/, 'names the missing hash');
      return true;
    },
    'starting without credentials must fail loudly, not silently run unprotected',
  );
});

test('a too-short session secret is refused', () => {
  assert.throws(
    () => loadConfig({ ...VALID, SESSION_SECRET: 'short' }),
    /SESSION_SECRET/,
  );
});

/**
 * The property names below are consumed all over src/. A rename that is not
 * reflected here reads as `undefined`, which silently disables whatever it
 * guards — that is exactly how `secure` cookies once got turned off in
 * production without anything failing.
 */
test('the config exposes every key the application reads', () => {
  const config = loadConfig(VALID);

  for (const key of [
    'port',
    'sessionSecret',
    'adminPasswordHash',
    'databasePath',
    'uploadDir',
    'previewDir',
    'previewMaxEdge',
    'maxUploadBytes',
    'sessionIdleMs',
    'nodeEnv',
    'isProduction',
  ]) {
    assert.ok(key in config, `config must expose "${key}"`);
    assert.notEqual(config[key], undefined, `config.${key} must not be undefined`);
  }
});

test('nodeEnv reports production accurately, because security settings hang off it', () => {
  assert.equal(loadConfig({ ...VALID, NODE_ENV: 'production' }).nodeEnv, 'production');
  assert.equal(loadConfig({ ...VALID, NODE_ENV: 'production' }).isProduction, true);

  assert.equal(loadConfig(VALID).nodeEnv, 'development', 'development is the default');
  assert.equal(loadConfig(VALID).isProduction, false);

  assert.throws(() => loadConfig({ ...VALID, NODE_ENV: 'prod' }), /NODE_ENV/, 'typos are rejected');
});

test('numeric settings are coerced and validated', () => {
  const config = loadConfig({ ...VALID, PORT: '8080', PREVIEW_MAX_EDGE: '1200', SESSION_IDLE_MINUTES: '30' });

  assert.equal(config.port, 8080);
  assert.equal(config.previewMaxEdge, 1200);
  assert.equal(config.sessionIdleMs, 30 * 60 * 1000, 'minutes are converted to milliseconds');

  assert.throws(() => loadConfig({ ...VALID, PORT: 'not-a-number' }), /PORT/);
  assert.throws(() => loadConfig({ ...VALID, PORT: '0' }), /PORT/);
  assert.throws(() => loadConfig({ ...VALID, PREVIEW_MAX_EDGE: '-5' }), /PREVIEW_MAX_EDGE/);
});

test('storage paths are resolved to absolute paths', () => {
  const config = loadConfig(VALID);

  for (const key of ['databasePath', 'uploadDir', 'previewDir']) {
    assert.ok(
      /^([A-Za-z]:[\\/]|\/)/.test(config[key]),
      `config.${key} must be absolute, got ${config[key]}`,
    );
  }
});
