import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const DATA_DIR = resolve('data');
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
