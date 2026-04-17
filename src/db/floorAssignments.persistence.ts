import { getDb } from './client';

export type TableAssignmentRow = {
  id: string;
  tableId: string;
  serverUserId: string;
  assignedAt: string;
};

export function initFloorAssignmentsTable() {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS table_assignments (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL UNIQUE,
      server_user_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL
    );
  `);
}

export function getTableAssignments(): TableAssignmentRow[] {
  const db = getDb();
  initFloorAssignmentsTable();

  const rows = (db.getAllSync(
    `
    SELECT id, table_id, server_user_id, assigned_at
    FROM table_assignments
    ORDER BY assigned_at DESC
    `
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    tableId: row.table_id,
    serverUserId: row.server_user_id,
    assignedAt: row.assigned_at,
  }));
}

export function assignServerToTable(input: {
  id: string;
  tableId: string;
  serverUserId: string;
}) {
  const db = getDb();
  initFloorAssignmentsTable();

  const now = new Date().toISOString();

  db.runSync(
    `
    INSERT INTO table_assignments (id, table_id, server_user_id, assigned_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(table_id)
    DO UPDATE SET
      server_user_id = excluded.server_user_id,
      assigned_at = excluded.assigned_at
    `,
    input.id,
    input.tableId,
    input.serverUserId,
    now
  );
}

export function clearTableAssignment(tableId: string) {
  const db = getDb();
  initFloorAssignmentsTable();

  db.runSync(
    `DELETE FROM table_assignments WHERE table_id = ?`,
    tableId
  );
}