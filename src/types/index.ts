// src/types/index.ts

export type UserRole = 'server' | 'cashier' | 'manager';

export type AppPlan = 'free' | 'pro';

export type PaymentMethod = 'cash' | 'orange_money' | 'mtn_money';

export type TableStatus = 'free' | 'occupied' | 'waiting_payment' | 'paid';

export type OrderStatus = 'draft' | 'open' | 'waiting_payment' | 'paid' | 'cancelled';

export interface Establishment {
  id: string;
  name: string;
  city: string | null;
  isSetupComplete: boolean;

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
  isActive: boolean;
  createdAt: string;
}

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  isActive: boolean;
}

export interface Payment {
  method: PaymentMethod;
  amountReceived: number;
  changeGiven: number;
  paidAt: string;
  cashierUserId: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  tableId: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  payment: Payment | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  barcode: string | null;
  isBarcodeBased: boolean;
  isActive: boolean;
}

export interface SetupEmployeeInput {
  name: string;
  identifier: string;
  pin: string;
  role: UserRole;
}

export interface SetupTableInput {
  name: string;
}

export interface SetupPayload {
  establishmentName: string;
  city?: string | null;
  manager: SetupEmployeeInput;
  employees: SetupEmployeeInput[];
  tables: SetupTableInput[];
}