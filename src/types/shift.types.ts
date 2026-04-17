export type ShiftStatus = 'OPEN' | 'PENDING_CLOSE' | 'CLOSED' | 'VALIDATED';

export type ShiftStockItem = {
  productId: string;
  productName: string;
  openingExpectedQty: number;
  openingActualQty: number;
  openingAdjustment: number;
  soldQty: number;
  closingExpectedQty: number;
  closingActualQty: number;
  closingDiscrepancy: number;
};

export type ShiftPaymentTotals = {
  cash: number;
  mobile_money: number;
  other: number;
};

export type Shift = {
  id: string;
  cashierId: string;
  openedAt: string;
  closedAt: string | null;
  status: ShiftStatus;
  stockItems: ShiftStockItem[];
  totalSalesPAID: number;
  totalByPaymentMode: ShiftPaymentTotals;
  closureValidatedByManager: boolean;
};