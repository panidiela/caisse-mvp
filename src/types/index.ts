// src/types/index.ts

export type UserRole =
  | 'server'
  | 'cashier'
  | 'manager'
  | 'admin'
  | 'stockist';

export type AppPlan = 'free' | 'pro';

export type PaymentMethod =
  | 'cash'
  | 'orange_money'
  | 'mtn_money'
  | 'other';

export type ServiceMode =
  | 'free'
  | 'by_zone'
  | 'by_table';

export type SaleSourceType =
  | 'counter'
  | 'zone'
  | 'table'
  | 'free';

export type SaleDocumentStatus =
  | 'draft'
  | 'sent'
  | 'money_collected'
  | 'paid'
  | 'cancelled';

export type TableStatus = 'free' | 'occupied' | 'attention';

export type ShiftStatus = 'open' | 'closed';

export interface Permission {
  code: string;
  label: string;
}

export interface EstablishmentConfiguration {
  hasCounter: boolean;
  usesZones: boolean;
  usesTables: boolean;
  usesNumberedTables: boolean;
  serviceMode: ServiceMode;
}

export interface Establishment {
  id: string;
  name: string;
  city: string | null;
  isSetupComplete: boolean;

  configuration: EstablishmentConfiguration;

  plan: AppPlan;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
}

export interface User {
  id: string;
  name: string;
  identifier: string;
  pin: string;
  role: UserRole;
  permissionCodes: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Table {
  id: string;
  name: string;
  zoneId: string | null;
  status: TableStatus;
  isActive: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  categoryNameSnapshot?: string | null;
  price: number;
  barcode: string | null;
  isBarcodeBased: boolean;
  isActive: boolean;
}

export interface SaleItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amountReceived: number;
  changeGiven: number;
  paidAt: string;
  validatedByUserId: string;
}

export interface Sale {
  id: string;

  sourceType: SaleSourceType;

  // Optionnels selon le contexte
  zoneId: string | null;
  tableId: string | null;

  reference: string;

  status: SaleDocumentStatus;

  createdAt: string;
  updatedAt: string;

  createdByUserId: string;
  moneyCollectedByUserId: string | null;
  moneyCollectedAt: string | null;

  sentAt: string | null;

  items: SaleItem[];

  subtotal: number;
  total: number;

  payment: SalePayment | null;

  cancellationReason: string | null;
  cancelledByUserId: string | null;
  cancelledAt: string | null;
}

export interface StockCountLine {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
}

export interface StockDifferenceLine {
  productId: string;
  productNameSnapshot: string;
  theoreticalQuantity: number;
  actualQuantity: number;
  difference: number;
}

export interface Shift {
  id: string;
  cashierUserId: string;

  openedAt: string;
  closedAt: string | null;

  status: ShiftStatus;

  initialStock: StockCountLine[];
  finalStock: StockCountLine[];

  salesCount: number;
  totalPaidAmount: number;

  differenceLines: StockDifferenceLine[];
}

export interface SetupEmployeeInput {
  name: string;
  identifier: string;
  pin: string;
  role: UserRole;
}

export interface SetupZoneInput {
  name: string;
  tableCount: number;
}

export interface SetupPayload {
  establishmentName: string;
  city?: string | null;

  configuration: EstablishmentConfiguration;

  manager: SetupEmployeeInput;
  employees: SetupEmployeeInput[];

  zones: SetupZoneInput[];
}