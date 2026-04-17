export type LocalSaleStatus = 'DRAFT' | 'SENT' | 'MONEY_COLLECTED';

export type CartLine = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  qty: number;
};

export type TableDisplayStatus = 'free' | 'occupied' | 'waiting_payment' | 'paid';