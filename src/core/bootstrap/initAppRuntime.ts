import { useStore } from '../../store/useStore';

export async function initAppRuntime() {
  try {
    const store = useStore.getState();

    if (typeof store.initApp === 'function') {
      await Promise.resolve(store.initApp());
    }

    if (typeof store.hydrateFromDb === 'function') {
      await Promise.resolve(store.hydrateFromDb());
    }
  } catch (error) {
    console.error('App runtime init failed', error);
    throw error;
  }
}