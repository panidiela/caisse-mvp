import type { Order, Table, TableStatus } from '../../../src/types';

export function recalcOrder(order: Order): Order {
  const subtotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    ...order,
    subtotal,
    total: subtotal,
  };
}

export function isOrderClosed(order: Order): boolean {
  return order.status === 'paid' || order.status === 'cancelled';
}

export function isOrderOpen(order: Order): boolean {
  return !isOrderClosed(order);
}

export function getTableStatusFromOrders(tableId: string, orders: Order[]): TableStatus {
  const activeOrders = orders.filter((order) => order.tableId === tableId && isOrderOpen(order));

  if (activeOrders.length === 0) {
    return 'free';
  }

  const hasWaitingPayment = activeOrders.some(
    (order) => order.status === 'waiting_payment'
  );

  if (hasWaitingPayment) {
    return 'attention';
  }

  return 'occupied';
}

export function syncTablesWithOrders(tables: Table[], orders: Order[]): Table[] {
  return tables.map((table) => ({
    ...table,
    status: getTableStatusFromOrders(table.id, orders),
  }));
}

export function normalizeOrder(raw: Partial<Order>): Order {
  return {
    id: raw.id ?? '',
    tableId: raw.tableId ?? null,
    zoneId: raw.zoneId ?? null,
    sourceType: raw.sourceType ?? (raw.tableId ? 'table' : 'counter'),
    status: raw.status ?? 'open',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    createdByUserId: raw.createdByUserId ?? '',
    items: raw.items ?? [],
    subtotal: raw.subtotal ?? 0,
    total: raw.total ?? 0,
    payment: raw.payment ?? null,
  };
}