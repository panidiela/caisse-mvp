import { create } from 'zustand';
import type { AppState } from './store.types';
import { createAuthSlice } from './slices/authSlice';
import { createStaffSlice } from './slices/staffSlice';
import { createSetupSlice } from './slices/setupSlice';
import { createPlanSlice } from './slices/planSlice';
import { createDataSlice } from './slices/dataSlice';
import { createOrdersSlice } from './slices/ordersSlice';

export const useStore = create<AppState>()((...args) => ({
  ...createAuthSlice(...args),
  ...createStaffSlice(...args),
  ...createSetupSlice(...args),
  ...createPlanSlice(...args),
  ...createDataSlice(...args),
  ...createOrdersSlice(...args),
}));