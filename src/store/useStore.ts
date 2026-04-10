// src/store/useStore.ts

import { create } from 'zustand';
import uuid from 'react-native-uuid';
import {
  User,
  Table,
  Product,
  Order,
  OrderItem,
  PaymentMethod,
  Establishment,
  SetupPayload,
} from '../types';
import * as DB from '../db/database';

type StaffRole = 'server' | 'cashier' | 'manager';

interface AddStaffInput {
  name: string;
  identifier: string;
  pin: string;
  role: StaffRole;
}

interface AppState {
  // AUTH
  currentUser: User | null;
  users: User[];
  login: (user: User) => void;
  loginWithCredentials: (identifier: string, pin: string) => User | null;
  logout: () => void;

  // PERSONNEL
  addStaff: (input: AddStaffInput) => { ok: boolean; error?: string };
  removeStaff: (userId: string) => void;
  toggleStaffActive: (userId: string) => void;
  updateStaffPin: (userId: string, newPin: string) => { ok: boolean; error?: string };

  // ETABLISSEMENT
  establishment: Establishment | null;
  isSetupComplete: boolean;
  setupEstablishment: (payload: SetupPayload) => void;

  // TABLES
  addTablesForZone: (zoneName: string, count: number) => { ok: boolean; error?: string };
  renameTable: (tableId: string, newName: string) => { ok: boolean; error?: string };
  removeTable: (tableId: string) => { ok: boolean; error?: string };

  // PLAN PRO
  isPro: () => boolean;
  activatePro: (code: string) => boolean;

  // DATA
  tables: Table[];
  products: Product[];
  orders: Order[];

  // INIT / REFRESH
  initApp: () => void;
  refreshTables: () => void;
  refreshProducts: () => void;
  refreshOrders: () => void;

  // ORDERS
  getOrderForTable: (tableId: string) => Order | undefined;
  createOrder: (tableId: string | null, userId: string) => Order;
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

const PRO_ACTIVATION_CODES = ['YEWO-PRO-2025', 'YEWO-PRO-2026', 'YEWO-BETA-PRO'];

function recalcOrder(order: Order): Order {
  const subtotal = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { ...order, subtotal, total: subtotal };
}

export const useStore = create<AppState>((set, get) => ({
  // AUTH
  currentUser: null,
  users: [],

  login: (user) => set({ currentUser: user }),

  loginWithCredentials: (identifier, pin) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const normalizedPin = pin.trim();

    const user = get().users.find(
      (u) =>
        u.identifier === normalizedIdentifier &&
        u.pin === normalizedPin &&
        u.isActive
    );

    if (!user) return null;

    set({ currentUser: user });
    return user;
  },

  logout: () => set({ currentUser: null }),

  // PERSONNEL
  addStaff: (input) => {
    const name = input.name.trim();
    const identifier = input.identifier.trim().toLowerCase();
    const pin = input.pin.trim();

    if (!name) {
      return { ok: false, error: 'Le nom est obligatoire.' };
    }

    if (!identifier) {
      return { ok: false, error: 'L’identifiant est obligatoire.' };
    }

    if (pin.length < 4) {
      return { ok: false, error: 'Le PIN doit contenir au moins 4 chiffres.' };
    }

    const alreadyExists = get().users.some((u) => u.identifier === identifier);
    if (alreadyExists) {
      return { ok: false, error: 'Cet identifiant existe déjà.' };
    }

    const newUser: User = {
      id: uuid.v4() as string,
      name,
      identifier,
      pin,
      role: input.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      users: [...state.users, newUser],
    }));

    return { ok: true };
  },

  removeStaff: (userId) => {
    const currentUser = get().currentUser;

    set((state) => {
      const userToRemove = state.users.find((u) => u.id === userId);

      if (currentUser?.id === userId) {
        return state;
      }

      if (userToRemove?.role === 'manager') {
        const managerCount = state.users.filter(
          (u) => u.role === 'manager' && u.id !== userId
        ).length;

        if (managerCount === 0) {
          return state;
        }
      }

      return {
        users: state.users.filter((u) => u.id !== userId),
      };
    });
  },

  toggleStaffActive: (userId) => {
    const currentUser = get().currentUser;

    set((state) => {
      const target = state.users.find((u) => u.id === userId);
      if (!target) return state;

      if (currentUser?.id === userId) {
        return state;
      }

      if (target.role === 'manager' && target.isActive) {
        const activeManagersLeft = state.users.filter(
          (u) => u.role === 'manager' && u.isActive && u.id !== userId
        ).length;

        if (activeManagersLeft === 0) {
          return state;
        }
      }

      return {
        users: state.users.map((u) =>
          u.id === userId ? { ...u, isActive: !u.isActive } : u
        ),
      };
    });
  },

  updateStaffPin: (userId, newPin) => {
    const pin = newPin.trim();

    if (pin.length < 4) {
      return { ok: false, error: 'Le PIN doit contenir au moins 4 chiffres.' };
    }

    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, pin } : u
      ),
    }));

    return { ok: true };
  },

  // ETABLISSEMENT
  establishment: null,
  isSetupComplete: false,

  setupEstablishment: (payload) => {
    const now = new Date().toISOString();

    const manager: User = {
      id: uuid.v4() as string,
      name: payload.manager.name.trim(),
      identifier: payload.manager.identifier.trim().toLowerCase(),
      pin: payload.manager.pin.trim(),
      role: payload.manager.role,
      isActive: true,
      createdAt: now,
    };

    const employees: User[] = payload.employees.map((e) => ({
      id: uuid.v4() as string,
      name: e.name.trim(),
      identifier: e.identifier.trim().toLowerCase(),
      pin: e.pin.trim(),
      role: e.role,
      isActive: true,
      createdAt: now,
    }));

    const tables: Table[] = payload.tables.map((t) => ({
      id: uuid.v4() as string,
      name: t.name,
      status: 'free',
      isActive: true,
    }));

    const previous = get().establishment;

    const establishment: Establishment = {
      id: previous?.id ?? (uuid.v4() as string),
      name: payload.establishmentName.trim(),
      city: payload.city?.trim() || null,
      isSetupComplete: true,
      plan: previous?.plan ?? 'free',
      planActivatedAt: previous?.planActivatedAt ?? null,
      planExpiresAt: previous?.planExpiresAt ?? null,
    };

    set({
      establishment,
      users: [manager, ...employees],
      tables,
      isSetupComplete: true,
      currentUser: null,
      orders: [],
    });
  },

  // TABLES
  addTablesForZone: (zoneName, count) => {
    const normalizedZone = zoneName.trim();

    if (!normalizedZone) {
      return { ok: false, error: 'Le nom de la zone est obligatoire.' };
    }

    if (!Number.isInteger(count) || count <= 0) {
      return { ok: false, error: 'Le nombre de tables est invalide.' };
    }

    const existingNumbers = get()
      .tables
      .map((t) => t.name)
      .filter((name) => name.startsWith(normalizedZone + ' '))
      .map((name) => {
        const parts = name.split(' ');
        const last = parts[parts.length - 1];
        const num = parseInt(last, 10);
        return isNaN(num) ? 0 : num;
      });

    const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

    const newTables: Table[] = Array.from({ length: count }).map((_, index) => ({
      id: uuid.v4() as string,
      name: `${normalizedZone} ${maxExisting + index + 1}`,
      status: 'free',
      isActive: true,
    }));

    set((state) => ({
      tables: [...state.tables, ...newTables],
    }));

    return { ok: true };
  },

  renameTable: (tableId, newName) => {
    const normalizedName = newName.trim();

    if (!normalizedName) {
      return { ok: false, error: 'Le nom de la table est obligatoire.' };
    }

    const alreadyExists = get().tables.some(
      (t) => t.id !== tableId && t.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (alreadyExists) {
      return { ok: false, error: 'Une table avec ce nom existe déjà.' };
    }

    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, name: normalizedName } : t
      ),
    }));

    return { ok: true };
  },

  removeTable: (tableId) => {
    const hasOpenOrder = get().orders.some(
      (o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status)
    );

    if (hasOpenOrder) {
      return { ok: false, error: 'Impossible de supprimer une table avec une commande en cours.' };
    }

    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
    }));

    return { ok: true };
  },

  // PLAN PRO
  isPro: () => get().establishment?.plan === 'pro',

  activatePro: (code: string) => {
    const normalized = code.trim().toUpperCase();

    if (!PRO_ACTIVATION_CODES.includes(normalized)) {
      return false;
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);

    const current = get().establishment;

    set({
      establishment: {
        id: current?.id ?? (uuid.v4() as string),
        name: current?.name ?? 'Mon établissement',
        city: current?.city ?? null,
        isSetupComplete: current?.isSetupComplete ?? false,
        plan: 'pro',
        planActivatedAt: now.toISOString(),
        planExpiresAt: expires.toISOString(),
      },
    });

    return true;
  },

  // DATA
  tables: [],
  products: [],
  orders: [],

  // INIT / REFRESH
  initApp: () => {
    try {
      DB.initDB?.();
    } catch {}

    let dbProducts: Product[] = [];
    let dbOrders: Order[] = [];

    try {
      dbProducts = DB.getProducts?.() ?? [];
    } catch {}

    try {
      dbOrders = DB.getOrders?.() ?? [];
    } catch {}

    set((state) => ({
      products: dbProducts,
      orders: state.orders.length > 0 ? state.orders : dbOrders,
      tables: state.tables,
    }));
  },

  refreshTables: () => {
    set({ tables: [...get().tables] });
  },

  refreshProducts: () => {
    try {
      const dbProducts = DB.getProducts?.() ?? [];
      set({ products: dbProducts });
    } catch {
      set({ products: [...get().products] });
    }
  },

  refreshOrders: () => {
    set({ orders: [...get().orders] });
  },

  // ORDERS
  getOrderForTable: (tableId) => {
    return get().orders.find(
      (o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status)
    );
  },

  createOrder: (tableId, userId) => {
    const now = new Date().toISOString();

    const order: Order = {
      id: uuid.v4() as string,
      tableId,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      items: [],
      subtotal: 0,
      total: 0,
      payment: null,
    };

    set((state) => ({
      orders: [order, ...state.orders],
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, status: 'occupied' } : t
      ),
    }));

    return order;
  },

  addItemToOrder: (orderId, product) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = { ...orders[idx] };
    const existingIdx = order.items.findIndex((i) => i.productId === product.id);

    let newItems: OrderItem[];

    if (existingIdx >= 0) {
      newItems = order.items.map((item, i) =>
        i === existingIdx
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: (item.quantity + 1) * item.unitPriceSnapshot,
            }
          : item
      );
    } else {
      const newItem: OrderItem = {
        id: uuid.v4() as string,
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: 1,
        lineTotal: product.price,
      };
      newItems = [...order.items, newItem];
    }

    const updated = recalcOrder({
      ...order,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({ orders: newOrders });
  },

  updateItemQuantity: (orderId, itemId, quantity) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];

    let newItems: OrderItem[];

    if (quantity <= 0) {
      newItems = order.items.filter((i) => i.id !== itemId);
    } else {
      newItems = order.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              quantity,
              lineTotal: quantity * i.unitPriceSnapshot,
            }
          : i
      );
    }

    const updated = recalcOrder({
      ...order,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({ orders: newOrders });
  },

  removeItem: (orderId, itemId) => {
    get().updateItemQuantity(orderId, itemId, 0);
  },

  setOrderStatus: (orderId, status) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];

    const updated: Order = {
      ...order,
      status,
      updatedAt: new Date().toISOString(),
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId
          ? {
              ...t,
              status:
                status === 'waiting_payment'
                  ? 'waiting_payment'
                  : status === 'paid'
                  ? 'free'
                  : 'occupied',
            }
          : t
      ),
    });
  },

  payOrder: (orderId, method, amountReceived, cashierUserId) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];
    const changeGiven = amountReceived - order.total;
    const now = new Date().toISOString();

    const updated: Order = {
      ...order,
      status: 'paid',
      updatedAt: now,
      payment: {
        method,
        amountReceived,
        changeGiven: Math.max(0, changeGiven),
        paidAt: now,
        cashierUserId,
      },
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId ? { ...t, status: 'free' } : t
      ),
    });
  },
}));