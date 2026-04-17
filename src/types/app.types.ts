export type AppRole =
  | 'server'
  | 'cashier'
  | 'manager'
  | 'admin'
  | 'stockist';

export type AppUser = {
  id: string;
  name?: string;
  username?: string;
  identifier?: string;
  pin?: string;
  role: AppRole;
  isActive?: boolean;
};

export type EstablishmentMode =
  | 'counter'
  | 'room_with_tables'
  | 'room_without_tables'
  | 'mixed';

export type TableAssignment = {
  id: string;
  tableId: string;
  serverUserId: string;
  assignedAt: string;
};