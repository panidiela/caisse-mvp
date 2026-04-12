import uuid from 'react-native-uuid';
import type { AppSliceCreator, PlanSlice } from '../store.types';

const PRO_ACTIVATION_CODES = ['YEWO-PRO-2025', 'YEWO-PRO-2026', 'YEWO-BETA-PRO'];

export const createPlanSlice: AppSliceCreator<PlanSlice> = (set, get) => ({
  isPro: () => get().establishment?.plan === 'pro',

  activatePro: (code: string) => {
    const normalized = code.trim().toUpperCase();

    if (!PRO_ACTIVATION_CODES.includes(normalized)) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const current = get().establishment;

    set({
      establishment: {
        id: current?.id ?? (uuid.v4() as string),
        name: current?.name ?? 'Mon établissement',
        city: current?.city ?? null,
        isSetupComplete: current?.isSetupComplete ?? false,
        plan: 'pro',
        planActivatedAt: now.toISOString(),
        planExpiresAt: expiresAt.toISOString(),
        configuration:
          current?.configuration ?? {
            hasCounter: true,
            usesZones: false,
            usesTables: false,
            usesNumberedTables: false,
            serviceMode: 'free',
          },
      },
    });

    return true;
  },
});