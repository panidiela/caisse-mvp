export const schemaVersion = 1;

export const schemaStatements: string[] = [
  `
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    username TEXT,
    identifier TEXT,
    pin TEXT,
    role TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS establishment (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    establishment_name TEXT,
    city TEXT,
    mode TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS tables_data (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    number_value TEXT,
    zone_id TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    category_id TEXT,
    stock_quantity REAL NOT NULL DEFAULT 0,
    unit TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    table_id TEXT,
    zone_id TEXT,
    source_type TEXT NOT NULL,
    source_label TEXT,
    server_id TEXT NOT NULL,
    shift_id TEXT,
    total_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    cancelled_at TEXT,
    cancelled_by TEXT,
    cancel_reason TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity REAL NOT NULL,
    total REAL NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_at TEXT NOT NULL,
    paid_by_user_id TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY NOT NULL,
    cashier_id TEXT NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    status TEXT NOT NULL,
    total_sales_paid REAL NOT NULL DEFAULT 0,
    total_cash REAL NOT NULL DEFAULT 0,
    total_mobile_money REAL NOT NULL DEFAULT 0,
    total_other REAL NOT NULL DEFAULT 0,
    closure_validated_by_manager INTEGER NOT NULL DEFAULT 0
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS shift_stock_items (
    id TEXT PRIMARY KEY NOT NULL,
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
  `,
  `
  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    quantity_delta REAL NOT NULL,
    reason TEXT NOT NULL,
    sale_id TEXT,
    shift_id TEXT,
    created_at TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    note TEXT
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS stock_discrepancies (
    id TEXT PRIMARY KEY NOT NULL,
    shift_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    expected_qty REAL NOT NULL,
    actual_qty REAL NOT NULL,
    difference REAL NOT NULL,
    created_at TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    note TEXT
  );
  `,
];