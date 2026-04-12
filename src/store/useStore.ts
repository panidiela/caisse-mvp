import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppState } from './store.types';
import { createAuthSlice } from './slices/authSlice';
import { createStaffSlice } from './slices/staffSlice';
import { createSetupSlice } from './slices/setupSlice';
import { createPlanSlice } from './slices/planSlice';
import { createDataSlice } from './slices/dataSlice';
import { createOrdersSlice } from './slices/ordersSlice';

export const useStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createAuthSlice(set, get, api),
      ...createStaffSlice(set, get, api),
      ...createSetupSlice(set, get, api),
      ...createPlanSlice(set, get, api),
      ...createDataSlice(set, get, api),
      ...createOrdersSlice(set, get, api),

      isHydrating: false,

      hydrateFromDb: async () => {
        if (get().isHydrating) {
          return;
        }

        set({ isHydrating: true });

        try {
          const db = await import('../db/database');

          const tables =
            typeof db.getTables === 'function' ? db.getTables() : [];
          const products =
            typeof db.getProducts === 'function' ? db.getProducts() : [];
          const orders =
            typeof db.getOrders === 'function' ? db.getOrders() : [];
          const zones =
            typeof db.getZones === 'function' ? db.getZones() : [];
          const users =
            typeof db.getUsers === 'function' ? db.getUsers() : [];

          set((state) => ({
            tables: Array.isArray(tables) && tables.length > 0 ? tables : state.tables,
            products:
              Array.isArray(products) && products.length > 0
                ? products
                : state.products,
            orders: Array.isArray(orders) && orders.length > 0 ? orders : state.orders,
            zones: Array.isArray(zones) && zones.length > 0 ? zones : state.zones,
            users: Array.isArray(users) && users.length > 0 ? users : state.users,
            isHydrating: false,
          }));

          console.log('Hydration OK');
        } catch (error) {
          console.error('Hydration failed', error);
          set({ isHydrating: false });
        }
      },
    }),
    {
      name: 'yewo-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        establishment: state.establishment,
        isSetupComplete: state.isSetupComplete,
        zones: state.zones,
        tables: state.tables,
        products: state.products,
        orders: state.orders,
      }),
    }
  )
);