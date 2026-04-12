import * as DB from '../../db/database';
import type { Order, Product } from '../../types';
import type { AppSliceCreator, DataSlice } from '../store.types';
import { normalizeOrder, syncTablesWithOrders } from '../helpers/order';

export const createDataSlice: AppSliceCreator<DataSlice> = (set, get) => ({
  products: [],

  initApp: () => {
    const db = DB as Record<string, unknown>;

    try {
      (db.initDB as (() => void) | undefined)?.();
    } catch {}

    let dbProducts: Product[] = [];
    let dbOrders: Order[] = [];

    try {
      dbProducts = ((db.getProducts as (() => Product[]) | undefined)?.() ?? []) as Product[];
    } catch {}

    try {
      const rawOrders =
        ((db.getOrders as (() => Partial<Order>[]) | undefined)?.() ?? []) as Partial<Order>[];

      dbOrders = rawOrders.map(normalizeOrder);
    } catch {}

    set((state) => {
      const nextOrders = state.orders.length > 0 ? state.orders : dbOrders;
      const nextTables = syncTablesWithOrders(state.tables, nextOrders);

      return {
        products: dbProducts,
        orders: nextOrders,
        tables: nextTables,
      };
    });
  },

  refreshTables: () => {
    set((state) => ({
      tables: syncTablesWithOrders([...state.tables], state.orders),
    }));
  },

  refreshProducts: () => {
    const db = DB as Record<string, unknown>;

    try {
      const dbProducts =
        ((db.getProducts as (() => Product[]) | undefined)?.() ?? []) as Product[];

      set({ products: dbProducts });
    } catch {
      set({ products: [...get().products] });
    }
  },

  refreshOrders: () => {
    set((state) => ({
      orders: [...state.orders],
      tables: syncTablesWithOrders(state.tables, state.orders),
    }));
  },
});