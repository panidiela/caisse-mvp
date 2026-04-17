export type StockMovementReason =
  | 'SALE_PAID'
  | 'SALE_CANCELLED'
  | 'OPENING_ADJUSTMENT'
  | 'CLOSING_ADJUSTMENT'
  | 'MANUAL_ADJUSTMENT';

export type StockMovement = {
  id: string;
  productId: string;
  quantityDelta: number;
  reason: StockMovementReason;
  saleId?: string | null;
  shiftId?: string | null;
  createdAt: string;
  createdByUserId: string;
  note?: string | null;
};

export type StockDiscrepancy = {
  id: string;
  shiftId: string;
  productId: string;
  expectedQty: number;
  actualQty: number;
  difference: number;
  createdAt: string;
  cashierId: string;
  note?: string | null;
};