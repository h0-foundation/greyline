import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

// Where the SQLite DB lives. The default is an app-data dir OUTSIDE the project
// tree — deliberately. `next dev` (Turbopack) watches the whole repo root, and
// SQLite in WAL mode rewrites its -wal/-shm sidecars on every read; with the DB
// inside the tree that churn drove an endless recompile loop that spawned
// unbounded workers and OOM-crashed the machine. Keeping the DB out of the
// watched root removes the loop (and generated user data doesn't belong in the
// source tree anyway).
//
// GREYLINE_DATA_DIR overrides it: the Docker image pins it to the /app/data
// volume. CI/e2e inherit this same default so seeding and the test server agree.
const DATA_DIR = process.env.GREYLINE_DATA_DIR
  ? resolve(process.env.GREYLINE_DATA_DIR)
  : join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'greyline');
const DB_PATH = join(DATA_DIR, 'greyline.db');
const MIGRATIONS_DIR = resolve('server/db/migrations');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    runMigrations(db);

    // Clean shutdown on process exit — flushes WAL and removes lock files
    const cleanup = () => closeDb();
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  }
  return db;
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    database.prepare('SELECT name FROM _migrations').all()
      .map((row: any) => row.name)
  );

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    if (!applied.has(file)) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
      database.exec(sql);
      database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    }
  }
}

export function closeDb(): void {
  if (db) {
    try {
      // Checkpoint WAL to main DB file for clean state
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    } catch {
      // Ignore errors during shutdown
    }
    db = null;
  }
}
