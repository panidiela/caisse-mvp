import { getDb } from './client';
import { decrementStock, recordStockMovement } from './stock.persistence';
import type { PaymentMethod, Sale, SaleItem, SaleStatus } from '../types';

type CreateSaleInput = {
  id: string;
  tableId: string | null;
  zoneId: string | null;
  sourceType: 'counter' | 'table' | 'zone' | 'free';
  sourceLabel?: string | null;
  serverId: string;
  shiftId?: string | null;
  status: SaleStatus;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    total: number;
  }>;
  totalAmount: number;
};

export function createSaleRecord(input: CreateSaleInput) {
  const db = getDb();
  const now = new Date().toISOString();

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync(
      `INSERT INTO sales
        (id, status, table_id, zone_id, source_type, source_label, server_id, shift_id, total_amount, created_at, updated_at, cancelled_at, cancelled_by, cancel_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.status,
      input.tableId,
      input.zoneId,
      input.sourceType,
      input.sourceLabel ?? null,
      input.serverId,
      input.shiftId ?? null,
      input.totalAmount,
      now,
      now,
      null,
      null,
      null
    );

    for (const item of input.items) {
      db.runSync(
        `INSERT INTO sale_items
          (id, sale_id, product_id, product_name, unit_price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        input.id,
        item.productId,
        item.productName,
        item.unitPrice,
        item.quantity,
        item.total
      );
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function updateSaleStatusRecord(
  saleId: string,
  status: SaleStatus
) {
  const db = getDb();
  const now = new Date().toISOString();

  db.runSync(
    `UPDATE sales
     SET status = ?, updated_at = ?
     WHERE id = ?`,
    status,
    now,
    saleId
  );
}

export function addSalePaymentRecord(input: {
  id: string;
  saleId: string;
  shiftId?: string | null;
  method: PaymentMethod;
  amount: number;
  paidByUserId: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync(
      `INSERT INTO sale_payments
        (id, sale_id, method, amount, paid_at, paid_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.id,
      input.saleId,
      input.method,
      input.amount,
      now,
      input.paidByUserId
    );

    db.runSync(
      `UPDATE sales
       SET status = ?, shift_id = ?, updated_at = ?
       WHERE id = ?`,
      'PAID',
      input.shiftId ?? null,
      now,
      input.saleId
    );

    const items = (db.getAllSync(
      `SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`,
      input.saleId
    ) ?? []) as any[];

    for (const item of items) {
      const quantity = Number(item.quantity ?? 0);
      const productId = item.product_id;

      decrementStock(productId, quantity);

      recordStockMovement({
        id: `${input.saleId}-${productId}-${Math.random().toString(36).slice(2, 10)}`,
        productId,
        quantityDelta: -quantity,
        reason: 'SALE_PAID',
        saleId: input.saleId,
        shiftId: input.shiftId ?? null,
        createdByUserId: input.paidByUserId,
        note: 'Décrément automatique après paiement',
      });
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function getSalesFromDb(): Sale[] {
  const db = getDb();

  const salesRows = (db.getAllSync(
    `SELECT * FROM sales ORDER BY created_at DESC`
  ) ?? []) as any[];

  return salesRows.map((row) => {
    const itemRows = (db.getAllSync(
      `SELECT * FROM sale_items WHERE sale_id = ? ORDER BY rowid ASC`,
      row.id
    ) ?? []) as any[];

    const paymentRows = (db.getAllSync(
      `SELECT * FROM sale_payments WHERE sale_id = ? ORDER BY paid_at ASC`,
      row.id
    ) ?? []) as any[];

    const items: SaleItem[] = itemRows.map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price ?? 0),
      quantity: Number(item.quantity ?? 0),
      total: Number(item.total ?? 0),
    }));

    return {
      id: row.id,
      status: row.status,
      tableId: row.table_id ?? null,
      zoneId: row.zone_id ?? null,
      sourceType: row.source_type,
      sourceLabel: row.source_label ?? null,
      serverId: row.server_id,
      shiftId: row.shift_id ?? null,
      items,
      payments: paymentRows.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: Number(payment.amount ?? 0),
        paidAt: payment.paid_at,
        paidByUserId: payment.paid_by_user_id,
      })),
      totalAmount: Number(row.total_amount ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cancelledAt: row.cancelled_at ?? null,
      cancelledBy: row.cancelled_by ?? null,
      cancelReason: row.cancel_reason ?? null,
    } as Sale;
  });
}