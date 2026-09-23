import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { openDatabase } from '../../src/db/index.js';
import { migrate } from '../../src/db/migrate.js';

/**
 * Create a throwaway migrated database. Never touches data/oc.db.
 * Returns the handle plus a cleanup function for `t.after`.
 */
export function createTestDatabase() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-test-'));
  const file = path.join(dir, 'test.db');
  const db = openDatabase(file);
  migrate(db, { log: () => {} });

  return {
    db,
    file,
    cleanup() {
      try { db.close(); } catch { /* already closed */ }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
