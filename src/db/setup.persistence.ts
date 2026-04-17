import { getDb } from './client';

type PersistedUser = {
  id: string;
  name?: string;
  identifier?: string;
  pin?: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
};

type PersistedZone = {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
};

type PersistedTable = {
  id: string;
  name: string;
  zoneId?: string | null;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
};

type PersistedEstablishment = {
  id: string;
  name?: string;
  establishmentName?: string;
  city?: string | null;
  configuration?: {
    hasCounter?: boolean;
    usesZones?: boolean;
    usesTables?: boolean;
    usesNumberedTables?: boolean;
    serviceMode?: string;
  };
};

type PersistSetupSnapshotInput = {
  establishment: PersistedEstablishment | null;
  users: PersistedUser[];
  zones: PersistedZone[];
  tables: PersistedTable[];
};

function toDbBoolean(value: boolean | undefined, fallback = true): number {
  return value ?? fallback ? 1 : 0;
}

function getEstablishmentMode(
  configuration?: PersistedEstablishment['configuration']
): string | null {
  if (!configuration) return null;

  const hasCounter = !!configuration.hasCounter;
  const usesTables = !!configuration.usesTables;

  if (hasCounter && usesTables) return 'mixed';
  if (hasCounter && !usesTables) return 'counter';
  if (!hasCounter && usesTables) return 'room_with_tables';

  return 'room_without_tables';
}

export function persistSetupSnapshot(input: PersistSetupSnapshotInput) {
  const db = getDb();

  db.execSync('BEGIN TRANSACTION;');

  try {
    db.runSync('DELETE FROM establishment');
    db.runSync('DELETE FROM users');
    db.runSync('DELETE FROM users_legacy');
    db.runSync('DELETE FROM zones');
    db.runSync('DELETE FROM zones_legacy');
    db.runSync('DELETE FROM tables_data');
    db.runSync('DELETE FROM tables');

    if (input.establishment) {
      db.runSync(
        `INSERT INTO establishment (id, name, establishment_name, city, mode)
         VALUES (?, ?, ?, ?, ?)`,
        input.establishment.id,
        input.establishment.name ?? input.establishment.establishmentName ?? null,
        input.establishment.establishmentName ?? input.establishment.name ?? null,
        input.establishment.city ?? null,
        getEstablishmentMode(input.establishment.configuration)
      );
    }

    for (const user of input.users) {
      db.runSync(
        `INSERT INTO users (id, name, username, identifier, pin, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        user.id,
        user.name ?? null,
        null,
        user.identifier ?? null,
        user.pin ?? null,
        user.role,
        toDbBoolean(user.isActive, true)
      );

      db.runSync(
        `INSERT INTO users_legacy (id, name, role, identifier, pin, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        user.id,
        user.name ?? '',
        user.role,
        user.identifier ?? '',
        user.pin ?? '',
        toDbBoolean(user.isActive, true),
        user.createdAt ?? new Date().toISOString()
      );
    }

    for (const zone of input.zones) {
      db.runSync(
        `INSERT INTO zones (id, name)
         VALUES (?, ?)`,
        zone.id,
        zone.name
      );

      db.runSync(
        `INSERT INTO zones_legacy (id, name, isActive, createdAt)
         VALUES (?, ?, ?, ?)`,
        zone.id,
        zone.name,
        toDbBoolean(zone.isActive, true),
        zone.createdAt ?? new Date().toISOString()
      );
    }

    for (const table of input.tables) {
      db.runSync(
        `INSERT INTO tables_data (id, name, number_value, zone_id)
         VALUES (?, ?, ?, ?)`,
        table.id,
        table.name,
        null,
        table.zoneId ?? null
      );

      db.runSync(
        `INSERT INTO tables (id, name, zoneId, status, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        table.id,
        table.name,
        table.zoneId ?? null,
        table.status ?? 'free',
        toDbBoolean(table.isActive, true),
        table.createdAt ?? new Date().toISOString()
      );
    }

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}