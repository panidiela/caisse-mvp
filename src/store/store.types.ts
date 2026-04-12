import type { StateCreator } from 'zustand';
import type {
  Establishment,
  Order,
  PaymentMethod,
  Product,
  SaleSourceType,
  SetupPayload,
  Table,
  User,
  UserRole,
  Zone,
} from '../types';

export type StaffRole = Extract<UserRole, 'server' | 'cashier' | 'manager'>;

export interface AddStaffInput {
  name: string;
  identifier: string;
  pin: string;
  role: StaffRole;
}

export interface CreateOrderOptions {
  sourceType?: SaleSourceType;
  zoneId?: string | null;
}

export interface AuthSlice {
  currentUser: User | null;
  users: User[];
  login: (user: User) => void;
  loginWithCredentials: (identifier: string, pin: string) => User | null;
  logout: () => void;
}

export interface StaffSlice {
  addStaff: (input: AddStaffInput) => { ok: boolean; error?: string };
  removeStaff: (userId: string) => void;
  toggleStaffActive: (userId: string) => void;
  updateStaffPin: (userId: string, newPin: string) => { ok: boolean; error?: string };
}

export interface SetupSlice {
  establishment: Establishment | null;
  isSetupComplete: boolean;
  zones: Zone[];
  tables: Table[];
  setupEstablishment: (payload: SetupPayload) => void;
  addTablesForZone: (zoneName: string, count: number) => { ok: boolean; error?: string };
  renameTable: (tableId: string, newName: string) => { ok: boolean; error?: string };
  removeTable: (tableId: string) => { ok: boolean; error?: string };
}

export interface PlanSlice {
  isPro: () => boolean;
  activatePro: (code: string) => boolean;
}

export interface DataSlice {
  products: Product[];
  initApp: () => void;
  refreshTables: () => void;
  refreshProducts: () => void;
  refreshOrders: () => void;
}

export interface OrdersSlice {
  orders: Order[];
  getOrderForTable: (tableId: string) => Order | undefined;
  getOrdersForTable: (tableId: string) => Order[];
  createOrder: (tableId: string | null, userId: string, options?: CreateOrderOptions) => Order;
  addItemToOrder: (orderId: string, product: Product) => void;
  updateItemQuantity: (orderId: string, itemId: string, quantity: number) => void;
  removeItem: (orderId: string, itemId: string) => void;
  setOrderStatus: (orderId: string, status: Order['status']) => void;
  payOrder: (
    orderId: string,
    method: PaymentMethod,
    amountReceived: number,
    cashierUserId: string
  ) => void;
}

export type AppState = AuthSlice &
  StaffSlice &
  SetupSlice &
  PlanSlice &
  DataSlice &
  OrdersSlice;

export type AppSliceCreator<TSlice> = StateCreator<AppState, [], [], TSlice>;