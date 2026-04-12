import uuid from 'react-native-uuid';
import type { Establishment, Table, User, Zone } from '../../types';
import type { AppSliceCreator, SetupSlice } from '../store.types';
import { syncTablesWithOrders } from '../helpers/order';

export const createSetupSlice: AppSliceCreator<SetupSlice> = (set, get) => ({
  establishment: null,
  isSetupComplete: false,
  zones: [],
  tables: [],

  setupEstablishment: (payload) => {
    const now = new Date().toISOString();
    const previous = get().establishment;

    const manager: User = {
      id: uuid.v4() as string,
      name: payload.manager.name.trim(),
      identifier: payload.manager.identifier.trim().toLowerCase(),
      pin: payload.manager.pin.trim(),
      role: payload.manager.role,
      isActive: true,
      createdAt: now,
    };

    const employees: User[] = payload.employees.map((employee) => ({
      id: uuid.v4() as string,
      name: employee.name.trim(),
      identifier: employee.identifier.trim().toLowerCase(),
      pin: employee.pin.trim(),
      role: employee.role,
      isActive: true,
      createdAt: now,
    }));

    const zones: Zone[] = payload.configuration.usesZones
      ? payload.zones
          .filter((zone) => zone.name.trim().length > 0)
          .map((zone) => ({
            id: uuid.v4() as string,
            name: zone.name.trim(),
            isActive: true,
            createdAt: now,
          }))
      : [];

    let tables: Table[] = [];

    if (payload.configuration.usesTables) {
      if (payload.configuration.usesZones) {
        tables = payload.zones.flatMap((zone, index) => {
          const linkedZone = zones[index];
          const count = Math.max(0, zone.tableCount);

          return Array.from({ length: count }).map((_, tableIndex) => ({
            id: uuid.v4() as string,
            name: payload.configuration.usesNumberedTables
              ? `${zone.name.trim()} ${tableIndex + 1}`
              : `${zone.name.trim()} ${tableIndex + 1}`,
            zoneId: linkedZone?.id ?? null,
            status: 'free' as const,
            isActive: true,
            createdAt: now,
          }));
        });
      } else {
        const totalCount = Math.max(0, payload.zones[0]?.tableCount ?? 0);

        tables = Array.from({ length: totalCount }).map((_, index) => ({
          id: uuid.v4() as string,
          name: payload.configuration.usesNumberedTables
            ? `Table ${index + 1}`
            : `Table ${index + 1}`,
          zoneId: null,
          status: 'free' as const,
          isActive: true,
          createdAt: now,
        }));
      }
    }

    const establishment: Establishment = {
      id: previous?.id ?? (uuid.v4() as string),
      name: payload.establishmentName.trim(),
      city: payload.city?.trim() || null,
      isSetupComplete: true,
      plan: previous?.plan ?? 'free',
      planActivatedAt: previous?.planActivatedAt ?? null,
      planExpiresAt: previous?.planExpiresAt ?? null,
      configuration: payload.configuration,
    };

    set({
      establishment,
      users: [manager, ...employees],
      zones,
      tables,
      isSetupComplete: true,
      currentUser: null,
      orders: [],
    });
  },

  addTablesForZone: (zoneName, count) => {
    const normalizedZoneName = zoneName.trim();

    if (!normalizedZoneName) {
      return { ok: false, error: 'Le nom de la zone est obligatoire.' };
    }

    if (!Number.isInteger(count) || count <= 0) {
      return { ok: false, error: 'Le nombre de tables est invalide.' };
    }

    const targetZone = get().zones.find(
      (zone) => zone.name.toLowerCase() === normalizedZoneName.toLowerCase()
    );

    if (!targetZone) {
      return { ok: false, error: 'Zone introuvable.' };
    }

    const existingNumbers = get()
      .tables.filter((table) => table.zoneId === targetZone.id)
      .map((table) => {
        const match = table.name.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

    const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const now = new Date().toISOString();

    const newTables: Table[] = Array.from({ length: count }).map((_, index) => ({
      id: uuid.v4() as string,
      name: `${targetZone.name} ${maxExisting + index + 1}`,
      zoneId: targetZone.id,
      status: 'free',
      isActive: true,
      createdAt: now,
    }));

    set((state) => ({
      tables: [...state.tables, ...newTables],
    }));

    return { ok: true };
  },

  renameTable: (tableId, newName) => {
    const normalizedName = newName.trim();

    if (!normalizedName) {
      return { ok: false, error: 'Le nom de la table est obligatoire.' };
    }

    const alreadyExists = get().tables.some(
      (table) =>
        table.id !== tableId &&
        table.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (alreadyExists) {
      return { ok: false, error: 'Une table avec ce nom existe déjà.' };
    }

    set((state) => ({
      tables: state.tables.map((table) =>
        table.id === tableId ? { ...table, name: normalizedName } : table
      ),
    }));

    return { ok: true };
  },

  removeTable: (tableId) => {
    const hasOpenOrder = get().orders.some(
      (order) =>
        order.tableId === tableId &&
        order.status !== 'paid' &&
        order.status !== 'cancelled'
    );

    if (hasOpenOrder) {
      return {
        ok: false,
        error: 'Impossible de supprimer une table avec une commande en cours.',
      };
    }

    const remainingTables = get().tables.filter((table) => table.id !== tableId);

    set({
      tables: syncTablesWithOrders(remainingTables, get().orders),
    });

    return { ok: true };
  },
});