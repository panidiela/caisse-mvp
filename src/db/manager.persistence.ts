import { getDb } from './client';

export type ManagerShiftRow = {
  id: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  totalSalesPaid: number;
  totalCash: number;
  totalMobileMoney: number;
  totalOther: number;
};

export function getShiftsForManager(): ManagerShiftRow[] {
  const db = getDb();

  const rows = (db.getAllSync(
    `
    SELECT
      s.id,
      s.cashier_id,
      u.name as cashier_name,
      s.opened_at,
      s.closed_at,
      s.status,
      s.total_sales_paid,
      s.total_cash,
      s.total_mobile_money,
      s.total_other
    FROM shifts s
    LEFT JOIN users u ON u.id = s.cashier_id
    ORDER BY s.opened_at DESC
    `
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    cashierId: row.cashier_id,
    cashierName: row.cashier_name ?? 'Caissière inconnue',
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    status: row.status,
    totalSalesPaid: Number(row.total_sales_paid ?? 0),
    totalCash: Number(row.total_cash ?? 0),
    totalMobileMoney: Number(row.total_mobile_money ?? 0),
    totalOther: Number(row.total_other ?? 0),
  }));
}