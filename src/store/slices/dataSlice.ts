import * as DB from '../../db/database';
import { getSalesFromDb } from '../../db/sales.persistence';
import {
  assignServerToTable as persistAssignServerToTable,
  clearTableAssignment as persistClearTableAssignment,
  getTableAssignments,
  initFloorAssignmentsTable,
} from '../../db/floorAssignments.persistence';
import type { AppSliceCreator } from '../store.types';

export const createDataSlice: AppSliceCreator = (set, get) => ({
  users: [],
  zones: [],
  tables: [],
  products: [],
  orders: [],
  tableAssignments: [],
  isHydrating: false,

  initApp: async () => {
    try {
      set({ isHydrating: true });

      if (typeof DB.initDB === 'function') {
        await Promise.resolve(DB.initDB());
      }

      initFloorAssignmentsTable();

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

      const tableAssignments = getTableAssignments();

      set({
        users: Array.isArray(users) ? users : [],
        zones: Array.isArray(zones) ? zones : [],
        tables: Array.isArray(tables) ? tables : [],
        products: Array.isArray(products) ? products : [],
        orders: Array.isArray(orders) ? orders : [],
        tableAssignments: Array.isArray(tableAssignments) ? tableAssignments : [],
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

      initFloorAssignmentsTable();

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

      const tableAssignments = getTableAssignments();

      set({
        users: Array.isArray(users) ? users : [],
        zones: Array.isArray(zones) ? zones : [],
        tables: Array.isArray(tables) ? tables : [],
        products: Array.isArray(products) ? products : [],
        orders: Array.isArray(orders) ? orders : [],
        tableAssignments: Array.isArray(tableAssignments) ? tableAssignments : [],
      });

      console.log('Hydration OK');
    } catch (error) {
      console.error('Hydration failed', error);
    } finally {
      set({ isHydrating: false });
    }
  },

  refreshTables: async () => {
    try {
      const tables =
        typeof DB.getTables === 'function' ? await Promise.resolve(DB.getTables()) : [];
      set({ tables: Array.isArray(tables) ? tables : [] });
    } catch (error) {
      console.error('refreshTables failed', error);
    }
  },

  refreshProducts: async () => {
    try {
      const products =
        typeof DB.getProducts === 'function'
          ? await Promise.resolve(DB.getProducts())
          : [];
      set({ products: Array.isArray(products) ? products : [] });
    } catch (error) {
      console.error('refreshProducts failed', error);
    }
  },

  refreshOrders: async () => {
    try {
      let orders: any[] = [];
      try {
        orders = await Promise.resolve(getSalesFromDb());
      } catch (error) {
        console.error('refreshOrders getSalesFromDb failed', error);
        orders =
          typeof DB.getOrders === 'function'
            ? await Promise.resolve(DB.getOrders())
            : [];
      }

      set({ orders: Array.isArray(orders) ? orders : [] });
    } catch (error) {
      console.error('refreshOrders failed', error);
    }
  },

  assignServerToTable: (tableId: string, serverUserId: string) => {
    try {
      persistAssignServerToTable({
        id: `${tableId}-${serverUserId}`,
        tableId,
        serverUserId,
      });

      const tableAssignments = getTableAssignments();
      set({ tableAssignments });
    } catch (error) {
      console.error('assignServerToTable failed', error);
    }
  },

  clearTableAssignment: (tableId: string) => {
    try {
      persistClearTableAssignment(tableId);

      const tableAssignments = getTableAssignments();
      set({ tableAssignments });
    } catch (error) {
      console.error('clearTableAssignment failed', error);
    }
  },
});