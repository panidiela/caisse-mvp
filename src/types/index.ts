export type UserRole =
  | 'server'
  | 'cashier'
  | 'manager'
  | 'admin'
  | 'stockist';

export type ServiceMode = 'free' | 'by_zone' | 'by_table';

export type SaleSourceType = 'table' | 'counter' | 'zone' | 'free';

export type TableStatus = 'free' | 'occupied' | 'attention';

export type OrderStatus = 'open' | 'waiting_payment' | 'paid' | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'momo' | 'other';

export type SubscriptionPlan = 'free' | 'pro';

export interface User {
  id: string;
  name: string;
  identifier: string;
  pin: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Table {
  id: string;
  name: string;
  zoneId: string | null;
  status: TableStatus;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderPayment {
  method: PaymentMethod;
  amountReceived: number;
  changeGiven: number;
  paidAt: string;
  cashierUserId: string;
}

export interface Order {
  id: string;
  tableId: string | null;
  zoneId: string | null;
  sourceType: SaleSourceType;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  payment: OrderPayment | null;
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
  plan: SubscriptionPlan;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  configuration: EstablishmentConfiguration;
}

export interface SetupManagerPayload {
  name: string;
  identifier: string;
  pin: string;
  role: Extract<UserRole, 'manager' | 'admin'>;
}

export interface SetupEmployeePayload {
  name: string;
  identifier: string;
  pin: string;
  role: Extract<UserRole, 'server' | 'cashier' | 'stockist'>;
}

export interface SetupZonePayload {
  name: string;
  tableCount: number;
}

export interface SetupPayload {
  establishmentName: string;
  city?: string | null;
  configuration: EstablishmentConfiguration;
  manager: SetupManagerPayload;
  employees: SetupEmployeePayload[];
  zones: SetupZonePayload[];
}

export type Sale = Order;
export type SaleItem = OrderItem;
export type SalePayment = OrderPayment;