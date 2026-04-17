import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppState } from './store.types';
import { createAuthSlice } from './slices/authSlice';
import { createSetupSlice } from './slices/setupSlice';
import { createOrdersSlice } from './slices/ordersSlice';
import { createDataSlice } from './slices/dataSlice';

export const useStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSetupSlice(...args),
      ...createOrdersSlice(...args),
      ...createDataSlice(...args),
    }),
    {
      name: 'yewo-store',
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        currentUser: state.currentUser,
        isSetupComplete: state.isSetupComplete,
        establishment: state.establishment,
      }),

      version: 2,

      migrate: (persistedState: any) => {
        return {
          currentUser: persistedState?.currentUser ?? null,
          isSetupComplete: persistedState?.isSetupComplete ?? false,
          establishment: persistedState?.establishment ?? null,
        };
      },
    }
  )
);