import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Open a connection.
 *
 * `PRAGMA foreign_keys = ON` is applied to EVERY connection because SQLite
 * defaults it OFF. Without it the tag/trait delete asymmetry silently stops
 * working: deleting an in-use tag would succeed and leave characters invalid.
 * This is the single most important line in the data layer.
 */
export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');

  return db;
}

/** Run `fn` inside a transaction, rolling back on any throw. */
export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // The rollback itself failing must not mask the original error.
    }
    throw error;
  }
}
