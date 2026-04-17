import { getDb } from './client';
import { initDatabase } from './init';
import { initStockTable } from './stock.persistence';

type LegacyTable = {
  id: string;
  name: string;
  zoneId?: string | null;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
};

type LegacyProduct = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  barcode?: string | null;
  isBarcodeBased?: boolean;
  isActive?: boolean;
  createdAt?: string;
};

type LegacyOrderItem = {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
};

type LegacyOrderPayment = {
  method: 'cash' | 'mobile_money' | 'other';
  amountReceived: number;
  changeGiven: number;
  paidAt: string;
  cashierUserId: string;
} | null;

type LegacyOrder = {
  id: string;
  tableId?: string | null;
  zoneId?: string | null;
  sourceType?: string;
  status: 'open' | 'waiting_payment' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  subtotal: number;
  total: number;
  items: LegacyOrderItem[];
  payment?: LegacyOrderPayment;
};

type LegacyUser = {
  id: string;
  name: string;
  identifier?: string;
  pin?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
};

type LegacyZone = {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
};

const db = getDb();

const DEFAULT_TABLES: LegacyTable[] = [
  { id: 't1', name: 'Table 1', status: 'free' },
  { id: 't2', name: 'Table 2', status: 'free' },
  { id: 't3', name: 'Table 3', status: 'free' },
  { id: 't4', name: 'Table 4', status: 'free' },
];

const DEFAULT_PRODUCTS: LegacyProduct[] = [
  { id: 'p1', name: 'Castel Bière 65cl', price: 700, category: 'Bières', isActive: true },
  { id: 'p2', name: '33 Export 65cl', price: 700, category: 'Bières', isActive: true },
  { id: 'p3', name: 'Guinness 65cl', price: 800, category: 'Bières', isActive: true },
  { id: 'p4', name: 'Coca-Cola 50cl', price: 500, category: 'Sodas', isActive: true },
  { id: 'p5', name: 'Fanta Orange 50cl', price: 500, category: 'Sodas', isActive: true },
  { id: 'p6', name: 'Eau minérale 1.5L', price: 400, category: 'Eaux', isActive: true },
];

function toDbBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function fromDbBoolean(value: unknown, fallback = false): boolean {
  if (value === 1 || value === '1' || value === true) return true;
  if (value === 0 || value === '0' || value === false) return false;
  return fallback;
}

function hasColumn(tableName: string, columnName: string): boolean {
  try {
    const rows = db.getAllSync(`PRAGMA table_info(${tableName})`) as Array<{ name: string }>;
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

function rowToTable(row: any): LegacyTable {
  return {
    id: row.id,
    name: row.name,
    zoneId: row.zoneId ?? null,
    status: row.status ?? 'free',
    isActive: fromDbBoolean(row.isActive, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function rowToProduct(row: any): LegacyProduct {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price ?? 0),
    category: row.category ?? row.category_id ?? null,
    barcode: row.barcode ?? null,
    isBarcodeBased: fromDbBoolean(row.isBarcodeBased, false),
    isActive: fromDbBoolean(row.isActive ?? row.is_active, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function rowToUser(row: any): LegacyUser {
  return {
    id: row.id,
    name: row.name,
    identifier: row.identifier ?? '',
    pin: row.pin ?? '',
    role: row.role,
    isActive: fromDbBoolean(row.isActive ?? row.is_active, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function rowToZone(row: any): LegacyZone {
  return {
    id: row.id,
    name: row.name,
    isActive: fromDbBoolean(row.isActive, true),
    createdAt: row.createdAt ?? new Date().toISOString(),
  };
}

function rowToOrder(row: any): LegacyOrder {
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

function insertOrderItem(orderId: string, item: LegacyOrderItem) {
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
  initDatabase();
  initStockTable();

  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      zoneId TEXT,
      status TEXT NOT NULL DEFAULT 'free',
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tableId TEXT,
      zoneId TEXT,
      sourceType TEXT NOT NULL DEFAULT 'counter',
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
      lineTotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users_legacy (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      identifier TEXT,
      pin TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS zones_legacy (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT
    );
  `);

  ensureColumn('tables', 'zoneId', 'TEXT');
  ensureColumn('tables', 'isActive', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('tables', 'createdAt', 'TEXT');

  const now = new Date().toISOString();

  const tablesCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tables'
  );
  if (!tablesCount || tablesCount.count === 0) {
    for (const table of DEFAULT_TABLES) {
      db.runSync(
        `INSERT INTO tables (id, name, zoneId, status, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        table.id,
        table.name,
        table.zoneId ?? null,
        table.status ?? 'free',
        toDbBoolean(table.isActive ?? true),
        table.createdAt ?? now
      );
    }
  }

  const productsCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products'
  );
  if (!productsCount || productsCount.count === 0) {
    for (const product of DEFAULT_PRODUCTS) {
      db.runSync(
        `INSERT INTO products (id, name, price, category_id, stock_quantity, unit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        product.id,
        product.name,
        product.price,
        product.category ?? null,
        0,
        null,
        toDbBoolean(product.isActive ?? true)
      );
    }
  }

  try {
    const users = (db.getAllSync('SELECT * FROM users') ?? []) as any[];
    const legacyUsersCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM users_legacy'
    );

    if ((!legacyUsersCount || legacyUsersCount.count === 0) && users.length > 0) {
      for (const user of users) {
        db.runSync(
          `INSERT INTO users_legacy (id, name, role, identifier, pin, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          user.id,
          user.name ?? '',
          user.role,
          user.identifier ?? '',
          user.pin ?? '',
          user.is_active ?? 1,
          now
        );
      }
    }
  } catch (error) {
    console.error('Legacy users sync failed', error);
  }

  try {
    const zones = (db.getAllSync('SELECT * FROM zones') ?? []) as any[];
    const legacyZonesCount = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM zones_legacy'
    );

    if ((!legacyZonesCount || legacyZonesCount.count === 0) && zones.length > 0) {
      for (const zone of zones) {
        db.runSync(
          `INSERT INTO zones_legacy (id, name, isActive, createdAt)
           VALUES (?, ?, ?, ?)`,
          zone.id,
          zone.name,
          1,
          now
        );
      }
    }
  } catch (error) {
    console.error('Legacy zones sync failed', error);
  }
}

export function getTables(): LegacyTable[] {
  const rows = (db.getAllSync(
    'SELECT * FROM tables WHERE isActive = 1 ORDER BY name ASC'
  ) ?? []) as any[];

  return rows.map(rowToTable);
}

export function replaceTables(tables: LegacyTable[]) {
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
        table.status ?? 'free',
        toDbBoolean(table.isActive ?? true),
        table.createdAt ?? new Date().toISOString()
      );
    }
    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}

export function updateTableStatus(id: string, status: string) {
  db.runSync('UPDATE tables SET status = ? WHERE id = ?', status, id);
}

export function getProducts(): LegacyProduct[] {
  const rows = (db.getAllSync(
    'SELECT id, name, price, category_id, is_active FROM products ORDER BY name ASC'
  ) ?? []) as any[];

  return rows.map(rowToProduct);
}

export function getProductByBarcode(_barcode: string): LegacyProduct | null {
  return null;
}

export function getOrders(): LegacyOrder[] {
  const rows = (db.getAllSync(
    'SELECT * FROM orders ORDER BY createdAt DESC'
  ) ?? []) as any[];

  return rows.map(rowToOrder);
}

export function getOrderById(id: string): LegacyOrder | null {
  const row = db.getFirstSync('SELECT * FROM orders WHERE id = ?', id) as any;
  if (!row) return null;
  return rowToOrder(row);
}

export function getOpenOrderForTable(tableId: string): LegacyOrder | null {
  const row = db.getFirstSync(
    `SELECT * FROM orders
     WHERE tableId = ? AND status NOT IN ('paid', 'cancelled')
     ORDER BY updatedAt DESC
     LIMIT 1`,
    tableId
  ) as any;

  if (!row) return null;
  return rowToOrder(row);
}

export function createOrder(order: LegacyOrder) {
  db.runSync(
    `INSERT INTO orders
      (id, tableId, zoneId, sourceType, status, createdAt, updatedAt, createdByUserId, subtotal, total,
       paymentMethod, paymentAmountReceived, paymentChangeGiven, paymentPaidAt, paymentCashierUserId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    order.id,
    order.tableId ?? null,
    order.zoneId ?? null,
    order.sourceType ?? 'counter',
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

export function updateOrder(order: LegacyOrder) {
  db.runSync(
    `UPDATE orders
     SET tableId = ?, zoneId = ?, sourceType = ?, status = ?, updatedAt = ?, subtotal = ?, total = ?,
         paymentMethod = ?, paymentAmountReceived = ?, paymentChangeGiven = ?, paymentPaidAt = ?, paymentCashierUserId = ?
     WHERE id = ?`,
    order.tableId ?? null,
    order.zoneId ?? null,
    order.sourceType ?? 'counter',
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

export function getUsers(): LegacyUser[] {
  try {
    const rows = (db.getAllSync(
      'SELECT id, name, identifier, pin, role, is_active FROM users ORDER BY name ASC'
    ) ?? []) as any[];

    return rows.map(rowToUser);
  } catch (error) {
    console.error('getUsers failed', error);
    return [];
  }
}

export function getZones(): LegacyZone[] {
  try {
    const rows = (db.getAllSync(
      'SELECT id, name FROM zones ORDER BY name ASC'
    ) ?? []) as any[];

    return rows.map(rowToZone);
  } catch (error) {
    console.error('getZones failed', error);
    return [];
  }
}

export { getDb } from './client';
export { initDatabase } from './init';