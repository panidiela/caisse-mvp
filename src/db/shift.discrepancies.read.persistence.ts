import { getDb } from './client';

function ensureShiftDiscrepancyTables() {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock_discrepancies (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      expected_qty REAL NOT NULL DEFAULT 0,
      actual_qty REAL NOT NULL DEFAULT 0,
      difference REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      cashier_id TEXT NOT NULL,
      note TEXT
    );
  `);
}

export type ShiftDiscrepancyRow = {
  id: string;
  shiftId: string;
  productId: string;
  productName: string;
  expectedQty: number;
  actualQty: number;
  difference: number;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  note: string | null;
};

export function getRecentShiftDiscrepancies(limit = 30): ShiftDiscrepancyRow[] {
  const db = getDb();

  ensureShiftDiscrepancyTables();

  const rows = (db.getAllSync(
    `
    SELECT
      d.id,
      d.shift_id,
      d.product_id,
      p.name as product_name,
      d.expected_qty,
      d.actual_qty,
      d.difference,
      d.created_at,
      d.cashier_id,
      u.name as cashier_name,
      d.note
    FROM stock_discrepancies d
    LEFT JOIN products p ON p.id = d.product_id
    LEFT JOIN users u ON u.id = d.cashier_id
    ORDER BY d.created_at DESC
    LIMIT ?
    `,
    limit
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    shiftId: row.shift_id,
    productId: row.product_id,
    productName: row.product_name ?? row.product_id,
    expectedQty: Number(row.expected_qty ?? 0),
    actualQty: Number(row.actual_qty ?? 0),
    difference: Number(row.difference ?? 0),
    createdAt: row.created_at,
    cashierId: row.cashier_id,
    cashierName: row.cashier_name ?? 'Caissière inconnue',
    note: row.note ?? null,
  }));
}