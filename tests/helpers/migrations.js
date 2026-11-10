import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDatabase } from '../../src/db/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function createLegacyDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-legacy-'));
  const file = path.join(dir, 'legacy.db');
  const db = openDatabase(file);
  db.exec(fs.readFileSync(path.join(root, 'src/db/migrations/001_initial.sql'), 'utf8'));
  db.exec(`
    CREATE TABLE schema_migration (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT INTO schema_migration VALUES ('001_initial.sql', '2026-01-01T00:00:00.000Z');
  `);

  return {
    db,
    cleanup() {
      try { db.close(); } catch { /* already closed */ }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
