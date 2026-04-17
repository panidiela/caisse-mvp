import { getDb } from './client';

export type ManagerStockRow = {
  productId: string;
  productName: string;
  quantity: number;
  isLowStock: boolean;
};

export type ManagerStockMovementRow = {
  id: string;
  productId: string;
  productName: string;
  quantityDelta: number;
  reason: string;
  saleId: string | null;
  shiftId: string | null;
  createdAt: string;
  createdByUserId: string;
  note: string | null;
};

export function getStockForManager(): ManagerStockRow[] {
  const db = getDb();

  const rows = (db.getAllSync(
    `
    SELECT
      p.id as product_id,
      p.name as product_name,
      COALESCE(s.quantity, 0) as quantity
    FROM products p
    LEFT JOIN stock s ON s.product_id = p.id
    WHERE COALESCE(p.is_active, 1) = 1
    ORDER BY p.name ASC
    `
  ) ?? []) as any[];

  return rows.map((row) => {
    const quantity = Number(row.quantity ?? 0);

    return {
      productId: row.product_id,
      productName: row.product_name,
      quantity,
      isLowStock: quantity <= 5,
    };
  });
}

export function getRecentStockMovementsForManager(limit = 20): ManagerStockMovementRow[] {
  const db = getDb();

  const rows = (db.getAllSync(
    `
    SELECT
      m.id,
      m.product_id,
      p.name as product_name,
      m.quantity_delta,
      m.reason,
      m.sale_id,
      m.shift_id,
      m.created_at,
      m.created_by_user_id,
      m.note
    FROM stock_movements_log m
    LEFT JOIN products p ON p.id = m.product_id
    ORDER BY m.created_at DESC
    LIMIT ?
    `,
    limit
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name ?? row.product_id,
    quantityDelta: Number(row.quantity_delta ?? 0),
    reason: row.reason,
    saleId: row.sale_id ?? null,
    shiftId: row.shift_id ?? null,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    note: row.note ?? null,
  }));
}