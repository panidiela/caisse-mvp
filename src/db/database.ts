// src/db/database.ts

import * as SQLite from 'expo-sqlite';
import { Order, Product, Table } from '../types';
import { MOCK_PRODUCTS, MOCK_TABLES } from '../data/mockData';

const db = SQLite.openDatabaseSync('caisse.db');

export function initDB() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'free'
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      barcode TEXT,
      isBarcodeBased INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tableId TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdByUserId TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT,
      paymentAmountReceived REAL,
      paymentChangeGiven REAL,
      paymentPaidAt TEXT,
      paymentCashierUserId TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      productId TEXT NOT NULL,
      productNameSnapshot TEXT NOT NULL,
      unitPriceSnapshot REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      lineTotal REAL NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id)
    );
  `);

  // Seed tables if empty
  const tableCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM tables');
  if (tableCount && tableCount.count === 0) {
    for (const t of MOCK_TABLES) {
      db.runSync(
        'INSERT INTO tables (id, name, status) VALUES (?, ?, ?)',
        t.id, t.name, t.status
      );
    }
  }

  // Seed products if empty
  const productCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM products');
  if (productCount && productCount.count === 0) {
    for (const p of MOCK_PRODUCTS) {
      db.runSync(
        'INSERT INTO products (id, name, price, category, barcode, isBarcodeBased, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
        p.id, p.name, p.price, p.category, p.barcode, p.isBarcodeBased ? 1 : 0, p.isActive ? 1 : 0
      );
    }
  }
}

// --- Tables ---
export function getTables(): Table[] {
  const rows = db.getAllSync<Table>('SELECT * FROM tables ORDER BY name');
  return rows;
}

export function updateTableStatus(id: string, status: Table['status']) {
  db.runSync('UPDATE tables SET status = ? WHERE id = ?', status, id);
}

// --- Products ---
export function getProducts(): Product[] {
  const rows = db.getAllSync<any>('SELECT * FROM products WHERE isActive = 1 ORDER BY category, name');
  return rows.map(r => ({
    ...r,
    isBarcodeBased: r.isBarcodeBased === 1,
    isActive: r.isActive === 1,
    barcode: r.barcode || null,
  }));
}

export function getProductByBarcode(barcode: string): Product | null {
  const row = db.getFirstSync<any>('SELECT * FROM products WHERE barcode = ? AND isActive = 1', barcode);
  if (!row) return null;
  return {
    ...row,
    isBarcodeBased: row.isBarcodeBased === 1,
    isActive: row.isActive === 1,
    barcode: row.barcode || null,
  };
}

// --- Orders ---
function rowToOrder(row: any): Order {
  const items = db.getAllSync<any>(
    'SELECT * FROM order_items WHERE orderId = ?', row.id
  );
  const payment = row.paymentMethod ? {
    method: row.paymentMethod,
    amountReceived: row.paymentAmountReceived,
    changeGiven: row.paymentChangeGiven,
    paidAt: row.paymentPaidAt,
    cashierUserId: row.paymentCashierUserId,
  } : null;
  return {
    id: row.id,
    tableId: row.tableId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdByUserId: row.createdByUserId,
    subtotal: row.subtotal,
    total: row.total,
    items: items.map(i => ({
      id: i.id,
      productId: i.productId,
      productNameSnapshot: i.productNameSnapshot,
      unitPriceSnapshot: i.unitPriceSnapshot,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    payment,
  };
}

export function getOrders(): Order[] {
  const rows = db.getAllSync<any>('SELECT * FROM orders ORDER BY createdAt DESC');
  return rows.map(rowToOrder);
}

export function getOrderById(id: string): Order | null {
  const row = db.getFirstSync<any>('SELECT * FROM orders WHERE id = ?', id);
  if (!row) return null;
  return rowToOrder(row);
}

export function getOpenOrderForTable(tableId: string): Order | null {
  const row = db.getFirstSync<any>(
    "SELECT * FROM orders WHERE tableId = ? AND status NOT IN ('paid', 'cancelled') ORDER BY createdAt DESC LIMIT 1",
    tableId
  );
  if (!row) return null;
  return rowToOrder(row);
}

export function createOrder(order: Order) {
  db.runSync(
    'INSERT INTO orders (id, tableId, status, createdAt, updatedAt, createdByUserId, subtotal, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    order.id, order.tableId, order.status, order.createdAt, order.updatedAt, order.createdByUserId, order.subtotal, order.total
  );
  for (const item of order.items) {
    _insertItem(item, order.id);
  }
}

function _insertItem(item: Order['items'][0], orderId: string) {
  db.runSync(
    'INSERT INTO order_items (id, orderId, productId, productNameSnapshot, unitPriceSnapshot, quantity, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
    item.id, orderId, item.productId, item.productNameSnapshot, item.unitPriceSnapshot, item.quantity, item.lineTotal
  );
}

export function updateOrder(order: Order) {
  db.runSync(
    `UPDATE orders SET 
      tableId = ?, status = ?, updatedAt = ?, subtotal = ?, total = ?,
      paymentMethod = ?, paymentAmountReceived = ?, paymentChangeGiven = ?, paymentPaidAt = ?, paymentCashierUserId = ?
     WHERE id = ?`,
    order.tableId,
    order.status,
    order.updatedAt,
    order.subtotal,
    order.total,
    order.payment?.method ?? null,
    order.payment?.amountReceived ?? null,
    order.payment?.changeGiven ?? null,
    order.payment?.paidAt ?? null,
    order.payment?.cashierUserId ?? null,
    order.id
  );
  // Delete and re-insert items
  db.runSync('DELETE FROM order_items WHERE orderId = ?', order.id);
  for (const item of order.items) {
    _insertItem(item, order.id);
  }
}
