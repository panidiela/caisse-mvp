import { getDb } from './client';

export type StockMovementRow = {
  id: string;
  productId: string;
  quantityDelta: number;
  reason: string;
  saleId: string | null;
  shiftId: string | null;
  createdAt: string;
  createdByUserId: string;
  note: string | null;
};

export function initStockTable() {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock (
      product_id TEXT PRIMARY KEY,
      quantity REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_movements_log (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity_delta REAL NOT NULL,
      reason TEXT NOT NULL,
      sale_id TEXT,
      shift_id TEXT,
      created_at TEXT NOT NULL,
      created_by_user_id TEXT NOT NULL,
      note TEXT
    );
  `);
}

export function getStock(productId: string): number {
  const db = getDb();

  const row = db.getFirstSync(
    `SELECT quantity FROM stock WHERE product_id = ?`,
    productId
  ) as any;

  return Number(row?.quantity ?? 0);
}

export function setStock(productId: string, quantity: number) {
  const db = getDb();

  db.runSync(
    `
    INSERT INTO stock (product_id, quantity)
    VALUES (?, ?)
    ON CONFLICT(product_id)
    DO UPDATE SET quantity = excluded.quantity
    `,
    productId,
    quantity
  );
}

export function ensureStockRow(productId: string) {
  const db = getDb();

  db.runSync(
    `
    INSERT INTO stock (product_id, quantity)
    VALUES (?, 0)
    ON CONFLICT(product_id) DO NOTHING
    `,
    productId
  );
}

export function decrementStock(productId: string, qty: number) {
  const db = getDb();

  ensureStockRow(productId);

  db.runSync(
    `
    UPDATE stock
    SET quantity = quantity - ?
    WHERE product_id = ?
    `,
    qty,
    productId
  );
}

export function recordStockMovement(input: {
  id: string;
  productId: string;
  quantityDelta: number;
  reason: string;
  saleId?: string | null;
  shiftId?: string | null;
  createdByUserId: string;
  note?: string | null;
}) {
  const db = getDb();
  const now = new Date().toISOString();

  db.runSync(
    `
    INSERT INTO stock_movements_log
      (id, product_id, quantity_delta, reason, sale_id, shift_id, created_at, created_by_user_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    input.id,
    input.productId,
    input.quantityDelta,
    input.reason,
    input.saleId ?? null,
    input.shiftId ?? null,
    now,
    input.createdByUserId,
    input.note ?? null
  );
}

export function adjustStockManually(input: {
  id: string;
  productId: string;
  quantityDelta: number;
  createdByUserId: string;
  note?: string | null;
}) {
  const db = getDb();

  ensureStockRow(input.productId);

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync(
      `
      UPDATE stock
      SET quantity = quantity + ?
      WHERE product_id = ?
      `,
      input.quantityDelta,
      input.productId
    );

    recordStockMovement({
      id: input.id,
      productId: input.productId,
      quantityDelta: input.quantityDelta,
      reason: 'MANUAL_ADJUSTMENT',
      saleId: null,
      shiftId: null,
      createdByUserId: input.createdByUserId,
      note: input.note ?? 'Ajustement manuel stockiste',
    });

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function getAllStockRows(): Array<{ productId: string; quantity: number }> {
  const db = getDb();

  const rows = (db.getAllSync(
    `SELECT product_id, quantity FROM stock ORDER BY product_id ASC`
  ) ?? []) as any[];

  return rows.map((row) => ({
    productId: row.product_id,
    quantity: Number(row.quantity ?? 0),
  }));
}

export function getStockMovementsForManager(limit = 50): StockMovementRow[] {
  const db = getDb();

  const rows = (db.getAllSync(
    `
    SELECT
      id,
      product_id,
      quantity_delta,
      reason,
      sale_id,
      shift_id,
      created_at,
      created_by_user_id,
      note
    FROM stock_movements_log
    ORDER BY created_at DESC
    LIMIT ?
    `,
    limit
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    quantityDelta: Number(row.quantity_delta ?? 0),
    reason: row.reason,
    saleId: row.sale_id ?? null,
    shiftId: row.shift_id ?? null,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    note: row.note ?? null,
  }));
}