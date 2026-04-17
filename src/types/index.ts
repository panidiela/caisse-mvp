export * from './app.types';
export * from './sale.types';
export * from './shift.types';
export * from './stock.types';

/**
 * Compatibilité temporaire avec l'ancien code.
 * On garde encore quelques aliases pour éviter de casser l'app
 * pendant la transition Order -> Sale.
 */

export type LegacyOrderStatus =
  | 'open'
  | 'waiting_payment'
  | 'paid'
  | 'cancelled';

export type LegacyOrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  total: number;
};

export type LegacyOrderPayment = {
  id: string;
  method: 'cash' | 'mobile_money' | 'other';
  amount: number;
  paidAt: string;
  paidBy?: string;
};

export type LegacyOrder = {
  id: string;
  status: LegacyOrderStatus;
  tableId?: string | null;
  zoneId?: string | null;
  serverId?: string;
  cashierId?: string | null;
  items: LegacyOrderItem[];
  payments?: LegacyOrderPayment[];
  total?: number;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = LegacyOrder;