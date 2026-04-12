import * as SQLite from 'expo-sqlite';
import type { Order, Product, Table } from '../types';
import { MOCK_PRODUCTS, MOCK_TABLES } from '../data/mockData';

const db = SQLite.openDatabaseSync('caisse.db');

function hasColumn(tableName: string, columnName: string): boolean {
  try {
    const rows = db.getAllSync(`PRAGMA table_info(${tableName})`) as Array<{
      name: string;
    }>;

    return rows.some((row) => row.name === columnName);
  } catch {
    return false;
  }
}

function ensureColumn(tableName: string, columnName: string, definition: string) {
  try {
    if (!hasColumn(tableName, columnName)) {
      db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
    }
  } catch (error) {
    console.error(`Failed to add column ${tableName}.${columnName}`, error);
  }
}

function toDbBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function fromDbBoolean(value: unknown, fallback = false): boolean {
  if (value === 1 || value === '1' || value === true) return true;
  if (value === 0 || value === '0' || value === false) return false;
  return fallback;
}

function rowToTable(row: any): Table {
  return {
    id: row.id,
    name: row.name,
    zoneId: row.zoneId ?? null,
    status: row.status ?? 'free',
    isActive: fromDbBoolean(row.isActive, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function rowToOrder(row: any): Order {
  const items = (db.getAllSync(
    'SELECT * FROM order_items WHERE orderId = ? ORDER BY rowid ASC',
    row.id
  ) ?? []) as any[];

  const payment =
    row.paymentMethod != null
      ? {
          method: row.paymentMethod,
          amountReceived: Number(row.paymentAmountReceived ?? 0),
          changeGiven: Number(row.paymentChangeGiven ?? 0),
          paidAt: row.paymentPaidAt ?? new Date().toISOString(),
          cashierUserId: row.paymentCashierUserId ?? '',
        }
      : null;

  return {
    id: row.id,
    tableId: row.tableId ?? null,
    zoneId: row.zoneId ?? null,
    sourceType: row.sourceType ?? (row.tableId ? 'table' : 'counter'),
    status: row.status ?? 'open',
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    createdByUserId: row.createdByUserId ?? '',
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      unitPriceSnapshot: Number(item.unitPriceSnapshot ?? 0),
      quantity: Number(item.quantity ?? 0),
      lineTotal: Number(item.lineTotal ?? 0),
    })),
    payment,
  };
}

function insertOrderItem(orderId: string, item: Order['items'][number]) {
  db.runSync(
    `INSERT INTO order_items
      (id, orderId, productId, productNameSnapshot, unitPriceSnapshot, quantity, lineTotal)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    orderId,
    item.productId,
    item.productNameSnapshot,
    item.unitPriceSnapshot,
    item.quantity,
    item.lineTotal
  );
}

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
      category TEXT,
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

  // Migration douce : on ajoute les colonnes APRÈS la création de base,
  // pour supporter les anciennes DB déjà présentes sur le téléphone.
  ensureColumn('tables', 'zoneId', 'TEXT');
  ensureColumn('tables', 'isActive', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('tables', 'createdAt', 'TEXT');

  ensureColumn('products', 'createdAt', 'TEXT');

  ensureColumn('orders', 'zoneId', 'TEXT');
  ensureColumn('orders', 'sourceType', `TEXT NOT NULL DEFAULT 'counter'`);

  // Les index ne sont créés qu'après les migrations de colonnes.
  try {
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_orders_tableId ON orders(tableId);
      CREATE INDEX IF NOT EXISTS idx_orders_zoneId ON orders(zoneId);
      CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
    `);
  } catch (error) {
    console.error('Failed to create indexes', error);
  }

  const now = new Date().toISOString();

  const tableCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tables'
  );

  if (!tableCount || tableCount.count === 0) {
    for (const table of MOCK_TABLES) {
      db.runSync(
        `INSERT INTO tables (id, name, zoneId, status, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        table.id,
        table.name,
        (table as any).zoneId ?? null,
        table.status ?? 'free',
        toDbBoolean((table as any).isActive ?? true),
        (table as any).createdAt ?? now
      );
    }
  } else {
    try {
      db.runSync(
        `UPDATE tables
         SET isActive = COALESCE(isActive, 1),
             createdAt = COALESCE(createdAt, ?)
         WHERE createdAt IS NULL OR createdAt = ''`,
        now
      );
    } catch (error) {
      console.error('Failed to normalize existing tables', error);
    }
  }

  const productCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products'
  );

  if (!productCount || productCount.count === 0) {
    for (const product of MOCK_PRODUCTS) {
      db.runSync(
        `INSERT INTO products
          (id, name, price, category, barcode, isBarcodeBased, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        product.id,
        product.name,
        product.price,
        product.category ?? null,
        (product as any).barcode ?? null,
        toDbBoolean((product as any).isBarcodeBased ?? false),
        toDbBoolean((product as any).isActive ?? true),
        (product as any).createdAt ?? now
      );
    }
  } else {
    try {
      db.runSync(
        `UPDATE products
         SET createdAt = COALESCE(createdAt, ?)
         WHERE createdAt IS NULL OR createdAt = ''`,
        now
      );
    } catch (error) {
      console.error('Failed to normalize existing products', error);
    }
  }
}

export function getTables(): Table[] {
  const rows = (db.getAllSync(
    'SELECT * FROM tables WHERE isActive = 1 ORDER BY name ASC'
  ) ?? []) as any[];

  return rows.map(rowToTable);
}

export function replaceTables(tables: Table[]) {
  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync('DELETE FROM tables');

    for (const table of tables) {
      db.runSync(
        `INSERT INTO tables (id, name, zoneId, status, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        table.id,
        table.name,
        table.zoneId ?? null,
        table.status,
        toDbBoolean(table.isActive),
        table.createdAt
      );
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function updateTableStatus(id: string, status: Table['status']) {
  db.runSync('UPDATE tables SET status = ? WHERE id = ?', status, id);
}

export function getProducts(): Product[] {
  const rows = (db.getAllSync(
    'SELECT * FROM products WHERE isActive = 1 ORDER BY category, name'
  ) ?? []) as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    category: row.category ?? null,
    isActive: fromDbBoolean(row.isActive, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  }));
}

export function getProductByBarcode(barcode: string): Product | null {
  const row = db.getFirstSync(
    'SELECT * FROM products WHERE barcode = ? AND isActive = 1',
    barcode
  ) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    category: row.category ?? null,
    isActive: fromDbBoolean(row.isActive, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

export function getOrders(): Order[] {
  const rows = (db.getAllSync(
    'SELECT * FROM orders ORDER BY createdAt DESC'
  ) ?? []) as any[];

  return rows.map(rowToOrder);
}

export function getOrderById(id: string): Order | null {
  const row = db.getFirstSync('SELECT * FROM orders WHERE id = ?', id) as any;

  if (!row) return null;

  return rowToOrder(row);
}

export function getOpenOrderForTable(tableId: string): Order | null {
  const row = db.getFirstSync(
    `SELECT * FROM orders
     WHERE tableId = ?
       AND status NOT IN ('paid', 'cancelled')
     ORDER BY updatedAt DESC
     LIMIT 1`,
    tableId
  ) as any;

  if (!row) return null;

  return rowToOrder(row);
}

export function createOrder(order: Order) {
  db.runSync(
    `INSERT INTO orders
      (id, tableId, zoneId, sourceType, status, createdAt, updatedAt, createdByUserId, subtotal, total,
       paymentMethod, paymentAmountReceived, paymentChangeGiven, paymentPaidAt, paymentCashierUserId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    order.id,
    order.tableId ?? null,
    order.zoneId ?? null,
    order.sourceType,
    order.status,
    order.createdAt,
    order.updatedAt,
    order.createdByUserId,
    order.subtotal,
    order.total,
    order.payment?.method ?? null,
    order.payment?.amountReceived ?? null,
    order.payment?.changeGiven ?? null,
    order.payment?.paidAt ?? null,
    order.payment?.cashierUserId ?? null
  );

  for (const item of order.items) {
    insertOrderItem(order.id, item);
  }
}

export function updateOrder(order: Order) {
  db.runSync(
    `UPDATE orders
     SET tableId = ?,
         zoneId = ?,
         sourceType = ?,
         status = ?,
         updatedAt = ?,
         subtotal = ?,
         total = ?,
         paymentMethod = ?,
         paymentAmountReceived = ?,
         paymentChangeGiven = ?,
         paymentPaidAt = ?,
         paymentCashierUserId = ?
     WHERE id = ?`,
    order.tableId ?? null,
    order.zoneId ?? null,
    order.sourceType,
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

  db.runSync('DELETE FROM order_items WHERE orderId = ?', order.id);

  for (const item of order.items) {
    insertOrderItem(order.id, item);
  }
}