import * as DB from '../../db/database';
import { getSalesFromDb } from '../../db/sales.persistence';
import type { AppSliceCreator } from '../store.types';

export const createDataSlice: AppSliceCreator = (set, get) => ({
  users: [],
  zones: [],
  tables: [],
  products: [],
  orders: [],
  isHydrating: false,

  initApp: async () => {
    try {
      set({ isHydrating: true });

      if (typeof DB.initDB === 'function') {
        await Promise.resolve(DB.initDB());
      }

      const users =
        typeof DB.getUsers === 'function' ? await Promise.resolve(DB.getUsers()) : [];
      const zones =
        typeof DB.getZones === 'function' ? await Promise.resolve(DB.getZones()) : [];
      const tables =
        typeof DB.getTables === 'function' ? await Promise.resolve(DB.getTables()) : [];
      const products =
        typeof DB.getProducts === 'function'
          ? await Promise.resolve(DB.getProducts())
          : [];

      let orders: any[] = [];
      try {
        orders = await Promise.resolve(getSalesFromDb());
      } catch (error) {
        console.error('getSalesFromDb failed, fallback to legacy orders', error);
        orders =
          typeof DB.getOrders === 'function'
            ? await Promise.resolve(DB.getOrders())
            : [];
      }

      set({
        users: Array.isArray(users) ? users : [],
        zones: Array.isArray(zones) ? zones : [],
        tables: Array.isArray(tables) ? tables : [],
        products: Array.isArray(products) ? products : [],
        orders: Array.isArray(orders) ? orders : [],
      });
    } catch (error) {
      console.error('DB init failed', error);
    } finally {
      set({ isHydrating: false });
    }
  },

  hydrateFromDb: async () => {
    try {
      set({ isHydrating: true });

      const users =
        typeof DB.getUsers === 'function' ? await Promise.resolve(DB.getUsers()) : [];
      const zones =
        typeof DB.getZones === 'function' ? await Promise.resolve(DB.getZones()) : [];
      const tables =
        typeof DB.getTables === 'function' ? await Promise.resolve(DB.getTables()) : [];
      const products =
        typeof DB.getProducts === 'function'
          ? await Promise.resolve(DB.getProducts())
          : [];

      let orders: any[] = [];
      try {
        orders = await Promise.resolve(getSalesFromDb());
      } catch (error) {
        console.error('getSalesFromDb failed, fallback to legacy orders', error);
        orders =
          typeof DB.getOrders === 'function'
            ? await Promise.resolve(DB.getOrders())
            : [];
      }

      set({
        users: Array.isArray(users) ? users : [],
        zones: Array.isArray(zones) ? zones : [],
        tables: Array.isArray(tables) ? tables : [],
        products: Array.isArray(products) ? products : [],
        orders: Array.isArray(orders) ? orders : [],
      });

      console.log('Hydration OK');
    } catch (error) {
      console.error('Hydration failed', error);
    } finally {
      set({ isHydrating: false });
    }
  },
});