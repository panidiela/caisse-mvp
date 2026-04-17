import { getDb } from './client';
import type { Shift, ShiftPaymentTotals, ShiftStatus } from '../types';

type OpenShiftInput = {
  id: string;
  cashierId: string;
  items: Array<{
    productId: string;
    productName: string;
    openingActualQty: number;
  }>;
};

type CloseShiftInput = {
  shiftId: string;
  cashierId: string;
  items: Array<{
    productId: string;
    productName: string;
    closingActualQty: number;
  }>;
};

type RegisterPaidSaleOnShiftInput = {
  shiftId: string;
  amount: number;
  method: 'cash' | 'mobile_money' | 'other';
};

function ensureShiftDiscrepancyTables() {
  const db = getDb();

  db.execSync(`
    CREATE TABLE IF NOT EXISTS shift_stock_items (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      opening_expected_qty REAL NOT NULL DEFAULT 0,
      opening_actual_qty REAL NOT NULL DEFAULT 0,
      opening_adjustment REAL NOT NULL DEFAULT 0,
      sold_qty REAL NOT NULL DEFAULT 0,
      closing_expected_qty REAL NOT NULL DEFAULT 0,
      closing_actual_qty REAL NOT NULL DEFAULT 0,
      closing_discrepancy REAL NOT NULL DEFAULT 0
    );

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

function makeTotals(row: any): ShiftPaymentTotals {
  return {
    cash: Number(row.total_cash ?? 0),
    mobile_money: Number(row.total_mobile_money ?? 0),
    other: Number(row.total_other ?? 0),
  };
}

function getCurrentStockMap() {
  const db = getDb();

  const rows = (db.getAllSync(
    `SELECT product_id, quantity FROM stock`
  ) ?? []) as any[];

  return new Map<string, number>(
    rows.map((row) => [row.product_id, Number(row.quantity ?? 0)])
  );
}

export function openShiftRecord(input: OpenShiftInput) {
  const db = getDb();
  const now = new Date().toISOString();
  const stockMap = getCurrentStockMap();

  ensureShiftDiscrepancyTables();

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync(
      `INSERT INTO shifts
        (id, cashier_id, opened_at, closed_at, status, total_sales_paid, total_cash, total_mobile_money, total_other, closure_validated_by_manager)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.cashierId,
      now,
      null,
      'OPEN',
      0,
      0,
      0,
      0,
      0
    );

    db.runSync(`DELETE FROM shift_stock_items WHERE shift_id = ?`, input.id);

    for (const item of input.items) {
      const openingExpectedQty = stockMap.get(item.productId) ?? 0;
      const openingActualQty = Number(item.openingActualQty ?? 0);
      const openingAdjustment = openingActualQty - openingExpectedQty;

      db.runSync(
        `INSERT INTO shift_stock_items
          (id, shift_id, product_id, product_name, opening_expected_qty, opening_actual_qty, opening_adjustment, sold_qty, closing_expected_qty, closing_actual_qty, closing_discrepancy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `${input.id}-${item.productId}`,
        input.id,
        item.productId,
        item.productName,
        openingExpectedQty,
        openingActualQty,
        openingAdjustment,
        0,
        0,
        0,
        0
      );
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function closeShiftRecord(input: CloseShiftInput) {
  const db = getDb();
  const now = new Date().toISOString();
  const stockMap = getCurrentStockMap();
  const closingMap = new Map(
    input.items.map((item) => [item.productId, Number(item.closingActualQty ?? 0)])
  );

  ensureShiftDiscrepancyTables();

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync(
      `UPDATE shifts
       SET status = ?, closed_at = ?
       WHERE id = ?`,
      'CLOSED',
      now,
      input.shiftId
    );

    db.runSync(`DELETE FROM stock_discrepancies WHERE shift_id = ?`, input.shiftId);

    const shiftItems = (db.getAllSync(
      `SELECT * FROM shift_stock_items WHERE shift_id = ?`,
      input.shiftId
    ) ?? []) as any[];

    for (const row of shiftItems) {
      const productId = row.product_id;
      const productName = row.product_name;
      const openingActualQty = Number(row.opening_actual_qty ?? 0);
      const closingExpectedQty = stockMap.get(productId) ?? 0;
      const closingActualQty = closingMap.get(productId) ?? 0;
      const closingDiscrepancy = closingActualQty - closingExpectedQty;
      const soldQty = openingActualQty - closingExpectedQty;

      db.runSync(
        `UPDATE shift_stock_items
         SET sold_qty = ?, closing_expected_qty = ?, closing_actual_qty = ?, closing_discrepancy = ?
         WHERE shift_id = ? AND product_id = ?`,
        soldQty,
        closingExpectedQty,
        closingActualQty,
        closingDiscrepancy,
        input.shiftId,
        productId
      );

      if (closingDiscrepancy !== 0) {
        db.runSync(
          `INSERT INTO stock_discrepancies
            (id, shift_id, product_id, expected_qty, actual_qty, difference, created_at, cashier_id, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `${input.shiftId}-${productId}`,
          input.shiftId,
          productId,
          closingExpectedQty,
          closingActualQty,
          closingDiscrepancy,
          now,
          input.cashierId,
          `Écart de fin de shift sur ${productName}`
        );
      }
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function getOpenShiftForCashier(cashierId: string): Shift | null {
  const db = getDb();

  const row = db.getFirstSync(
    `SELECT * FROM shifts
     WHERE cashier_id = ? AND status = 'OPEN'
     ORDER BY opened_at DESC
     LIMIT 1`,
    cashierId
  ) as any;

  if (!row) return null;

  return {
    id: row.id,
    cashierId: row.cashier_id,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    status: row.status as ShiftStatus,
    stockItems: [],
    totalSalesPAID: Number(row.total_sales_paid ?? 0),
    totalByPaymentMode: makeTotals(row),
    closureValidatedByManager: Number(row.closure_validated_by_manager ?? 0) === 1,
  };
}

export function getLatestShiftForCashier(cashierId: string): Shift | null {
  const db = getDb();

  const row = db.getFirstSync(
    `SELECT * FROM shifts
     WHERE cashier_id = ?
     ORDER BY opened_at DESC
     LIMIT 1`,
    cashierId
  ) as any;

  if (!row) return null;

  return {
    id: row.id,
    cashierId: row.cashier_id,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    status: row.status as ShiftStatus,
    stockItems: [],
    totalSalesPAID: Number(row.total_sales_paid ?? 0),
    totalByPaymentMode: makeTotals(row),
    closureValidatedByManager: Number(row.closure_validated_by_manager ?? 0) === 1,
  };
}

export function registerPaidSaleOnShift(input: RegisterPaidSaleOnShiftInput) {
  const db = getDb();

  const current = db.getFirstSync(
    `SELECT total_sales_paid, total_cash, total_mobile_money, total_other
     FROM shifts
     WHERE id = ?`,
    input.shiftId
  ) as any;

  if (!current) {
    throw new Error('Shift introuvable');
  }

  const nextTotalSalesPaid = Number(current.total_sales_paid ?? 0) + Number(input.amount ?? 0);
  const nextTotalCash =
    Number(current.total_cash ?? 0) + (input.method === 'cash' ? Number(input.amount ?? 0) : 0);
  const nextTotalMobileMoney =
    Number(current.total_mobile_money ?? 0) +
    (input.method === 'mobile_money' ? Number(input.amount ?? 0) : 0);
  const nextTotalOther =
    Number(current.total_other ?? 0) + (input.method === 'other' ? Number(input.amount ?? 0) : 0);

  db.runSync(
    `UPDATE shifts
     SET total_sales_paid = ?, total_cash = ?, total_mobile_money = ?, total_other = ?
     WHERE id = ?`,
    nextTotalSalesPaid,
    nextTotalCash,
    nextTotalMobileMoney,
    nextTotalOther,
    input.shiftId
  );
}