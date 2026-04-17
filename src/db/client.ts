import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('yewo.db');
  }

  return dbInstance;
}