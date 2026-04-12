import * as DB from '../../db/database';
import type { Order, Product, Table } from '../../types';
import type { AppSliceCreator, DataSlice } from '../store.types';
import { normalizeOrder, syncTablesWithOrders } from '../helpers/order';

export const createDataSlice: AppSliceCreator<DataSlice> = (set, get) => ({
  products: [],

  initApp: () => {
    try {
      DB.initDB();
    } catch (error) {
      console.error('DB init failed', error);
    }

    let dbTables: Table[] = [];
    let dbProducts: Product[] = [];
    let dbOrders: Order[] = [];

    try {
      dbTables = DB.getTables() ?? [];
    } catch (error) {
      console.error('DB getTables failed', error);
    }

    try {
      dbProducts = DB.getProducts() ?? [];
    } catch (error) {
      console.error('DB getProducts failed', error);
    }

    try {
      dbOrders = (DB.getOrders() ?? []).map(normalizeOrder);
    } catch (error) {
      console.error('DB getOrders failed', error);
    }

    set((state) => {
      const nextOrders = dbOrders.length > 0 ? dbOrders : state.orders;
      const baseTables = dbTables.length > 0 ? dbTables : state.tables;
      const nextTables = syncTablesWithOrders(baseTables, nextOrders);

      return {
        products: dbProducts.length > 0 ? dbProducts : state.products,
        orders: nextOrders,
        tables: nextTables,
      };
    });

    try {
      const syncedTables = get().tables;
      DB.replaceTables(syncedTables);
    } catch (error) {
      console.error('DB replaceTables after init failed', error);
    }
  },

  refreshTables: () => {
    const orders = get().orders;
    const currentTables = get().tables;
    const nextTables = syncTablesWithOrders(currentTables, orders);

    set({ tables: nextTables });

    try {
      DB.replaceTables(nextTables);
    } catch (error) {
      console.error('DB replaceTables failed', error);
    }
  },

  refreshProducts: () => {
    try {
      const dbProducts = DB.getProducts() ?? [];
      set({ products: dbProducts });
    } catch (error) {
      console.error('DB refreshProducts failed', error);
    }
  },

  refreshOrders: () => {
    try {
      const dbOrders = (DB.getOrders() ?? []).map(normalizeOrder);
      const nextTables = syncTablesWithOrders(get().tables, dbOrders);

      set({
        orders: dbOrders,
        tables: nextTables,
      });

      DB.replaceTables(nextTables);
    } catch (error) {
      console.error('DB refreshOrders failed', error);
    }
  },
});