import { getDb } from './client';
import { schemaStatements, schemaVersion } from './schema';

export async function initDatabase() {
  const db = getDb();

  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = OFF;
  `);

  for (const statement of schemaStatements) {
    db.execSync(statement);
  }

  const existing = db.getFirstSync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    ['schema_version']
  );

  if (!existing) {
    db.runSync(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)`,
      ['schema_version', String(schemaVersion)]
    );
  } else if (existing.value !== String(schemaVersion)) {
    db.runSync(
      `UPDATE app_meta SET value = ? WHERE key = ?`,
      [String(schemaVersion), 'schema_version']
    );
  }
}