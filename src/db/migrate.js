import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, transaction } from './index.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Apply pending migrations in filename order. Forward-only: there are no
 * down-migrations. Each file runs inside its own transaction, so a failure
 * leaves the schema at the last good migration rather than half-applied.
 */
export function migrate(db, { log = () => {} } = {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migration').all().map((row) => row.name)
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    transaction(db, () => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migration (name, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString()
      );
    });
    log(`applied ${file}`);
    count += 1;
  }

  return count;
}

// CLI entry: npm run migrate
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadConfig } = await import('../config.js');
  const config = loadConfig({
    SESSION_SECRET: 'cli-only-not-used-for-migrations',
    ADMIN_PASSWORD_HASH: 'cli',
    ...process.env
  });
  const db = openDatabase(config.databasePath);
  const applied = migrate(db, { log: (m) => console.log(m) });
  console.log(applied === 0 ? 'Already up to date.' : `Applied ${applied} migration(s).`);
  db.close();
}
