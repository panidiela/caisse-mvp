import type { AuthSlice, AppSliceCreator } from '../store.types';

export const createAuthSlice: AppSliceCreator<AuthSlice> = (set, get) => ({
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

    if (!user) {
      return null;
    }

    set({ currentUser: user });
    return user;
  },

  logout: () => set({ currentUser: null }),
});