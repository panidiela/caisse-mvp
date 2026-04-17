import uuid from 'react-native-uuid';
import type { AppSliceCreator } from '../store.types';
import {
  addSalePaymentRecord,
  createSaleRecord,
  getSalesFromDb,
  updateSaleStatusRecord,
} from '../../db/sales.persistence';
import {
  getOpenShiftForCashier,
  registerPaidSaleOnShift,
} from '../../db/shifts.persistence';

export const createOrdersSlice: AppSliceCreator = (set, get) => ({
  orders: [],

  createSale: (input) => {
    try {
      const saleId = uuid.v4() as string;

      const items = input.items.map((item) => ({
        id: uuid.v4() as string,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        total: item.total,
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

      createSaleRecord({
        id: saleId,
        tableId: input.tableId ?? null,
        zoneId: input.zoneId ?? null,
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel ?? null,
        serverId: input.serverId,
        shiftId: input.shiftId ?? null,
        status: input.status,
        items,
        totalAmount,
      });

      const sales = getSalesFromDb();

      set({
        orders: sales,
      });

      return saleId;
    } catch (error) {
      console.error('createSale failed', error);
      return null;
    }
  },

  updateSaleStatus: (saleId, status) => {
    try {
      updateSaleStatusRecord(saleId, status);
      const sales = getSalesFromDb();

      set({
        orders: sales,
      });
    } catch (error) {
      console.error('updateSaleStatus failed', error);
    }
  },

  paySale: ({ saleId, method, amount, paidByUserId }) => {
    try {
      const currentSales = getSalesFromDb();
      const sale = currentSales.find((item) => item.id === saleId);

      if (!sale) {
        throw new Error('Vente introuvable');
      }

      if (sale.status === 'PAID') {
        throw new Error('Cette vente est déjà payée');
      }

      if (sale.status !== 'MONEY_COLLECTED') {
        throw new Error("Cette vente n'est pas prête pour paiement");
      }

      const openShift = getOpenShiftForCashier(paidByUserId);

      if (!openShift) {
        throw new Error('Aucun shift ouvert pour cette caissière');
      }

      addSalePaymentRecord({
        id: uuid.v4() as string,
        saleId,
        shiftId: openShift.id,
        method,
        amount,
        paidByUserId,
      });

      registerPaidSaleOnShift({
        shiftId: openShift.id,
        amount,
        method,
      });

      const sales = getSalesFromDb();

      set({
        orders: sales,
      });
    } catch (error) {
      console.error('paySale failed', error);
      throw error;
    }
  },

  hydrateSalesFromDb: () => {
    try {
      const sales = getSalesFromDb();

      set({
        orders: sales,
      });
    } catch (error) {
      console.error('hydrateSalesFromDb failed', error);
    }
  },
});