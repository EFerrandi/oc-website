import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/index.js';
import { migrate } from './db/migrate.js';

const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
migrate(db, { log: (m) => console.log(`[migrate] ${m}`) });

const app = createApp({ config, db });
const server = app.listen(config.port, () => {
  console.log(`Listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    try { db.close(); } catch { /* already closed */ }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
