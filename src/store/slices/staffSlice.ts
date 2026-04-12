import uuid from 'react-native-uuid';
import type { User } from '../../types';
import type { AppSliceCreator, StaffSlice } from '../store.types';

export const createStaffSlice: AppSliceCreator<StaffSlice> = (set, get) => ({
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
        const remainingManagers = state.users.filter(
          (u) => u.role === 'manager' && u.id !== userId
        );

        if (remainingManagers.length === 0) {
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

      if (!target) {
        return state;
      }

      if (currentUser?.id === userId) {
        return state;
      }

      if (target.role === 'manager' && target.isActive) {
        const activeManagersLeft = state.users.filter(
          (u) => u.role === 'manager' && u.isActive && u.id !== userId
        );

        if (activeManagersLeft.length === 0) {
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
      users: state.users.map((u) => (u.id === userId ? { ...u, pin } : u)),
    }));

    return { ok: true };
  },
});