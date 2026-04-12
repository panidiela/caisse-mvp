import uuid from 'react-native-uuid';
import * as DB from '../../db/database';
import type { Order, OrderItem } from '../../types';
import type { AppSliceCreator, CreateOrderOptions, OrdersSlice } from '../store.types';
import {
  isOrderClosed,
  recalcOrder,
  syncTablesWithOrders,
} from '../helpers/order';

function persistAndSync(set: any, get: any, nextOrders: Order[]) {
  const nextTables = syncTablesWithOrders(get().tables, nextOrders);

  set({
    orders: nextOrders,
    tables: nextTables,
  });

  try {
    DB.replaceTables(nextTables);
  } catch (error) {
    console.error('DB replaceTables failed', error);
  }
}

export const createOrdersSlice: AppSliceCreator<OrdersSlice> = (set, get) => ({
  orders: [],

  getOrderForTable: (tableId) => {
    return get()
      .orders
      .filter(
        (order) =>
          order.tableId === tableId &&
          order.status !== 'paid' &&
          order.status !== 'cancelled'
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
  },

  getOrdersForTable: (tableId) => {
    return get()
      .orders
      .filter(
        (order) =>
          order.tableId === tableId &&
          order.status !== 'paid' &&
          order.status !== 'cancelled'
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  },

  createOrder: (tableId, userId, options?: CreateOrderOptions) => {
    const now = new Date().toISOString();
    const sourceType = options?.sourceType ?? (tableId ? 'table' : 'counter');

    const order: Order = {
      id: uuid.v4() as string,
      tableId,
      zoneId: options?.zoneId ?? null,
      sourceType,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      items: [],
      subtotal: 0,
      total: 0,
      payment: null,
    };

    try {
      DB.createOrder(order);
    } catch (error) {
      console.error('DB createOrder failed', error);
    }

    const nextOrders = [order, ...get().orders];
    persistAndSync(set, get, nextOrders);

    return order;
  },

  addItemToOrder: (orderId, product) => {
    const orders = get().orders;
    const orderIndex = orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) {
      return;
    }

    const order = orders[orderIndex];

    if (isOrderClosed(order)) {
      return;
    }

    const existingItemIndex = order.items.findIndex(
      (item) => item.productId === product.id
    );

    let newItems: OrderItem[];

    if (existingItemIndex >= 0) {
      newItems = order.items.map((item, index) =>
        index === existingItemIndex
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: (item.quantity + 1) * item.unitPriceSnapshot,
            }
          : item
      );
    } else {
      const newItem: OrderItem = {
        id: uuid.v4() as string,
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: 1,
        lineTotal: product.price,
      };

      newItems = [...order.items, newItem];
    }

    const updatedOrder = recalcOrder({
      ...order,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    try {
      DB.updateOrder(updatedOrder);
    } catch (error) {
      console.error('DB updateOrder(addItemToOrder) failed', error);
    }

    const nextOrders = [...orders];
    nextOrders[orderIndex] = updatedOrder;

    persistAndSync(set, get, nextOrders);
  },

  updateItemQuantity: (orderId, itemId, quantity) => {
    const orders = get().orders;
    const orderIndex = orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) {
      return;
    }

    const order = orders[orderIndex];

    if (isOrderClosed(order)) {
      return;
    }

    let newItems: OrderItem[];

    if (quantity <= 0) {
      newItems = order.items.filter((item) => item.id !== itemId);
    } else {
      newItems = order.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity,
              lineTotal: quantity * item.unitPriceSnapshot,
            }
          : item
      );
    }

    const updatedOrder = recalcOrder({
      ...order,
      items: newItems,
      updatedAt: new Date().toISOString(),
    });

    try {
      DB.updateOrder(updatedOrder);
    } catch (error) {
      console.error('DB updateOrder(updateItemQuantity) failed', error);
    }

    const nextOrders = [...orders];
    nextOrders[orderIndex] = updatedOrder;

    persistAndSync(set, get, nextOrders);
  },

  removeItem: (orderId, itemId) => {
    get().updateItemQuantity(orderId, itemId, 0);
  },

  setOrderStatus: (orderId, status) => {
    const orders = get().orders;
    const orderIndex = orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) {
      return;
    }

    const order = orders[orderIndex];

    const updatedOrder: Order = {
      ...order,
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      DB.updateOrder(updatedOrder);
    } catch (error) {
      console.error('DB updateOrder(setOrderStatus) failed', error);
    }

    const nextOrders = [...orders];
    nextOrders[orderIndex] = updatedOrder;

    persistAndSync(set, get, nextOrders);
  },

  payOrder: (orderId, method, amountReceived, cashierUserId) => {
    const orders = get().orders;
    const orderIndex = orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) {
      return;
    }

    const order = orders[orderIndex];

    if (isOrderClosed(order)) {
      return;
    }

    const safeAmountReceived = Number.isFinite(amountReceived) ? amountReceived : 0;
    const changeGiven = Math.max(0, safeAmountReceived - order.total);
    const paidAt = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      status: 'paid',
      updatedAt: paidAt,
      payment: {
        method,
        amountReceived: safeAmountReceived,
        changeGiven,
        paidAt,
        cashierUserId,
      },
    };

    try {
      DB.updateOrder(updatedOrder);
    } catch (error) {
      console.error('DB updateOrder(payOrder) failed', error);
    }

    const nextOrders = [...orders];
    nextOrders[orderIndex] = updatedOrder;

    persistAndSync(set, get, nextOrders);
  },
});