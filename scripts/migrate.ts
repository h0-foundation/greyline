import { getDb, closeDb } from '../server/db/index.js';

console.log('Running migrations...');
const db = getDb();
const migrations = db.prepare('SELECT name, applied_at FROM _migrations ORDER BY id').all();
console.log(`Applied ${migrations.length} migration(s):`);
for (const m of migrations as any[]) {
  console.log(`  ✓ ${m.name} (${m.applied_at})`);
}
closeDb();
console.log('Done.');
