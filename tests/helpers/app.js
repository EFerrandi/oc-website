import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../../src/app.js';
import { createTestDatabase } from './db.js';

export function testConfig(overrides = {}) {
  const mediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-media-'));
  return {
    nodeEnv: 'test',
    port: 0,
    databasePath: ':memory:',
    uploadDir: path.join(mediaRoot, 'uploads'),
    previewDir: path.join(mediaRoot, 'uploads', 'previews'),
    previewMaxEdge: 800,
    maxUploadBytes: 104_857_600,
    sessionSecret: 'test-session-secret-not-for-production',
    sessionIdleMs: 120 * 60 * 1000,
    adminPasswordHash: 'test-hash',
    ...overrides,
  };
}

/** Build an app backed by a fresh throwaway database. */
export function createTestApp(overrides = {}) {
  const { db, cleanup } = createTestDatabase();
  const config = testConfig(overrides);

  fs.mkdirSync(config.previewDir, { recursive: true });

  const app = createApp({ config, db, logger: { error() {}, warn() {}, info() {} } });
  return { app, db, config, cleanup };
}

/** Request header that enables NSFW content, mirroring the browser cookie. */
export const NSFW_ON = ['nsfw=1'];
