export type SaleStatus =
  | 'DRAFT'
  | 'SENT'
  | 'MONEY_COLLECTED'
  | 'PAID'
  | 'CANCELLED';

export type SaleSourceType = 'counter' | 'table' | 'zone' | 'free';

export type PaymentMethod = 'cash' | 'mobile_money' | 'other';

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  total: number;
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  paidByUserId: string;
};

export type Sale = {
  id: string;
  status: SaleStatus;
  tableId: string | null;
  zoneId: string | null;
  sourceType: SaleSourceType;
  sourceLabel?: string | null;
  serverId: string;
  shiftId: string | null;
  items: SaleItem[];
  payments: SalePayment[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
};