// src/store/useStore.ts

import { create } from 'zustand';
import uuid from 'react-native-uuid';
import {
  AppPlan,
  Establishment,
  EstablishmentConfiguration,
  PaymentMethod,
  Product,
  ProductCategory,
  Sale,
  SaleDocumentStatus,
  SaleItem,
  SaleSourceType,
  Shift,
  StockCountLine,
  StockDifferenceLine,
  Table,
  TableStatus,
  User,
  UserRole,
  Zone,
  SetupPayload,
} from '../types';
import * as DB from '../db/database';

type LegacySaleStatus = 'open' | 'waiting_payment';

interface AddStaffInput {
  name: string;
  identifier: string;
  pin: string;
  role: UserRole;
}

interface AddProductInput {
  name: string;
  price: number;
  categoryId?: string | null;
  categoryNameSnapshot?: string | null;
  barcode?: string | null;
  isBarcodeBased?: boolean;
}

interface AppState {
  currentUser: User | null;
  users: User[];
  login: (user: User) => void;
  loginWithCredentials: (identifier: string, pin: string) => User | null;
  logout: () => void;

  establishment: Establishment | null;
  isSetupComplete: boolean;
  setupEstablishment: (payload: SetupPayload) => void;
  updateEstablishment: (input: {
    name: string;
    city: string | null;
    configuration?: EstablishmentConfiguration;
  }) => { ok: boolean; error?: string };

  hasPermission: (permissionCode: string) => boolean;

  addStaff: (input: AddStaffInput) => { ok: boolean; error?: string };
  removeStaff: (userId: string) => void;
  toggleStaffActive: (userId: string) => void;
  updateStaffPin: (userId: string, newPin: string) => { ok: boolean; error?: string };

  zones: Zone[];
  tables: Table[];
  addTablesForZone: (zoneName: string, count: number) => { ok: boolean; error?: string };
  renameTable: (tableId: string, newName: string) => { ok: boolean; error?: string };
  removeTable: (tableId: string) => { ok: boolean; error?: string };

  productCategories: ProductCategory[];
  products: Product[];
  addProduct: (input: AddProductInput) => { ok: boolean; error?: string };
  removeProduct: (productId: string) => void;

  orders: Sale[];
  getOrderForTable: (tableId: string) => Sale | undefined;
  getOrdersForTable: (tableId: string) => Sale[];
  createOrder: (
    tableId: string | null,
    userId: string,
    options?: {
      sourceType?: SaleSourceType;
      zoneId?: string | null;
    }
  ) => Sale;
  addItemToOrder: (orderId: string, product: Product) => void;
  updateItemQuantity: (orderId: string, itemId: string, quantity: number) => void;
  removeItem: (orderId: string, itemId: string) => void;
  setOrderStatus: (
    orderId: string,
    status: SaleDocumentStatus | LegacySaleStatus
  ) => void;
  markOrderAsSent: (orderId: string) => void;
  markMoneyCollected: (orderId: string, userId: string) => void;
  payOrder: (
    orderId: string,
    method: PaymentMethod,
    amountReceived: number,
    cashierUserId: string
  ) => void;
  cancelOrder: (
    orderId: string,
    cancelledByUserId: string,
    reason: string
  ) => { ok: boolean; error?: string };

  shifts: Shift[];
  openShift: (
    cashierUserId: string,
    initialStock: StockCountLine[]
  ) => { ok: boolean; error?: string };
  closeShift: (
    cashierUserId: string,
    finalStock: StockCountLine[]
  ) => { ok: boolean; error?: string };
  getOpenShiftForCashier: (cashierUserId: string) => Shift | undefined;

  isPro: () => boolean;
  activatePro: (code: string) => boolean;

  initApp: () => void;
  refreshTables: () => void;
  refreshProducts: () => void;
  refreshOrders: () => void;
}

const PRO_ACTIVATION_CODES = ['YEWO-PRO-2025', 'YEWO-PRO-2026', 'YEWO-BETA-PRO'];

function nowIso() {
  return new Date().toISOString();
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function buildReference() {
  return `V-${Date.now().toString().slice(-6)}`;
}

function recalcSale(order: Sale): Sale {
  const subtotal = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { ...order, subtotal, total: subtotal };
}

function defaultConfiguration(): EstablishmentConfiguration {
  return {
    hasCounter: true,
    usesZones: false,
    usesTables: false,
    usesNumberedTables: false,
    serviceMode: 'free',
  };
}

function normalizeConfiguration(
  config?: Partial<EstablishmentConfiguration> | null
): EstablishmentConfiguration {
  const base = { ...defaultConfiguration(), ...(config ?? {}) };

  if (!base.usesTables) {
    base.usesNumberedTables = false;
  }

  if (!base.usesZones && base.serviceMode === 'by_zone') {
    base.serviceMode = 'free';
  }

  if (!base.usesTables && base.serviceMode === 'by_table') {
    base.serviceMode = 'free';
  }

  return base;
}

function getDefaultPermissionCodes(role: UserRole): string[] {
  switch (role) {
    case 'cashier':
      return [
        'sale.create',
        'sale.view_own',
        'sale.pay',
        'cashier.record_payment',
        'cashier.view_own_summary',
        'cashier.open_shift',
        'cashier.close_shift',
        'stock.view_shift',
      ];
    case 'server':
      return [
        'sale.create',
        'sale.edit_own_open',
        'sale.view_own',
        'sale.assign_table',
        'sale.create_without_table',
        'sale.split_bill',
        'sale.mark_money_collected',
      ];
    case 'manager':
      return [
        'sale.view_all',
        'sale.cancel',
        'report.view',
        'stock.view',
        'stock.adjust',
        'product.manage',
        'expense.manage',
        'cashier.view_all_summaries',
        'user.manage',
        'settings.manage',
      ];
    case 'admin':
      return ['*'];
    case 'stockist':
      return ['stock.view', 'stock.add_entry', 'stock.adjust', 'stock.inventory'];
    default:
      return [];
  }
}

function saleStatusToTableStatus(sales: Sale[]): TableStatus {
  const activeSales = sales.filter((o) => !['paid', 'cancelled'].includes(o.status));
  if (activeSales.length === 0) return 'free';

  const needsAttention = activeSales.some(
    (o) => o.status === 'sent' || o.status === 'money_collected'
  );

  if (needsAttention) return 'attention';
  return 'occupied';
}

function computeShiftDifferenceLines(
  initialStock: StockCountLine[],
  finalStock: StockCountLine[],
  paidSales: Sale[]
): StockDifferenceLine[] {
  const soldByProduct: Record<
    string,
    { productNameSnapshot: string; quantity: number }
  > = {};

  paidSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!soldByProduct[item.productId]) {
        soldByProduct[item.productId] = {
          productNameSnapshot: item.productNameSnapshot,
          quantity: 0,
        };
      }
      soldByProduct[item.productId].quantity += item.quantity;
    });
  });

  const initialMap: Record<string, StockCountLine> = {};
  initialStock.forEach((line) => {
    initialMap[line.productId] = line;
  });

  const finalMap: Record<string, StockCountLine> = {};
  finalStock.forEach((line) => {
    finalMap[line.productId] = line;
  });

  const productIds = new Set([
    ...Object.keys(initialMap),
    ...Object.keys(finalMap),
    ...Object.keys(soldByProduct),
  ]);

  return Array.from(productIds).map((productId) => {
    const initial = initialMap[productId];
    const final = finalMap[productId];
    const sold = soldByProduct[productId];

    const productNameSnapshot =
      initial?.productNameSnapshot ||
      final?.productNameSnapshot ||
      sold?.productNameSnapshot ||
      'Produit';

    const initialQty = initial?.quantity ?? 0;
    const soldQty = sold?.quantity ?? 0;
    const theoreticalQuantity = initialQty - soldQty;
    const actualQuantity = final?.quantity ?? 0;

    return {
      productId,
      productNameSnapshot,
      theoreticalQuantity,
      actualQuantity,
      difference: actualQuantity - theoreticalQuantity,
    };
  });
}

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  users: [],

  login: (user) => set({ currentUser: user }),

  loginWithCredentials: (identifier, pin) => {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const normalizedPin = pin.trim();

    const user = get().users.find(
      (u) =>
        u.identifier === normalizedIdentifier &&
        u.pin === normalizedPin &&
        u.isActive
    );

    if (!user) return null;

    set({ currentUser: user });
    return user;
  },

  logout: () => set({ currentUser: null }),

  establishment: null,
  isSetupComplete: false,

  setupEstablishment: (payload) => {
    const createdAt = nowIso();
    const configuration = normalizeConfiguration(payload.configuration);

    const manager: User = {
      id: uuid.v4() as string,
      name: payload.manager.name.trim(),
      identifier: normalizeIdentifier(payload.manager.identifier),
      pin: payload.manager.pin.trim(),
      role: payload.manager.role,
      permissionCodes: getDefaultPermissionCodes(payload.manager.role),
      isActive: true,
      createdAt,
    };

    const employees: User[] = payload.employees.map((e) => ({
      id: uuid.v4() as string,
      name: e.name.trim(),
      identifier: normalizeIdentifier(e.identifier),
      pin: e.pin.trim(),
      role: e.role,
      permissionCodes: getDefaultPermissionCodes(e.role),
      isActive: true,
      createdAt,
    }));

    const shouldCreateZones = configuration.usesZones;
    const shouldCreateTables = configuration.usesTables;

    const zones: Zone[] = shouldCreateZones
      ? payload.zones.map((z) => ({
          id: uuid.v4() as string,
          name: z.name.trim(),
          isActive: true,
        }))
      : [];

    let tables: Table[] = [];

    if (shouldCreateTables) {
      if (shouldCreateZones) {
        tables = zones.flatMap((zone, zoneIndex) => {
          const zoneInput = payload.zones[zoneIndex];
          const count = zoneInput.tableCount;

          return Array.from({ length: count }).map((_, index) => ({
            id: uuid.v4() as string,
            name: configuration.usesNumberedTables
              ? `${zone.name} ${index + 1}`
              : `${zone.name}`,
            zoneId: zone.id,
            status: 'free' as TableStatus,
            isActive: true,
          }));
        });
      } else {
        const totalCount = payload.zones.reduce(
          (sum, z) => sum + (Number(z.tableCount) || 0),
          0
        );

        tables = Array.from({ length: totalCount }).map((_, index) => ({
          id: uuid.v4() as string,
          name: configuration.usesNumberedTables ? `Table ${index + 1}` : 'Table',
          zoneId: null,
          status: 'free' as TableStatus,
          isActive: true,
        }));
      }
    }

    const establishment: Establishment = {
      id: uuid.v4() as string,
      name: payload.establishmentName.trim(),
      city: payload.city?.trim() || null,
      isSetupComplete: true,
      configuration,
      plan: 'free',
      planActivatedAt: null,
      planExpiresAt: null,
    };

    set({
      establishment,
      users: [manager, ...employees],
      zones,
      tables,
      orders: [],
      shifts: [],
      isSetupComplete: true,
      currentUser: null,
    });
  },

  updateEstablishment: (input) => {
    const current = get().establishment;

    if (!current) {
      return { ok: false, error: 'Aucun établissement configuré.' };
    }

    const name = input.name.trim();
    if (!name) {
      return { ok: false, error: 'Le nom de l’établissement est obligatoire.' };
    }

    const nextConfiguration = input.configuration
      ? normalizeConfiguration(input.configuration)
      : current.configuration;

    set({
      establishment: {
        ...current,
        name,
        city: input.city?.trim() || null,
        configuration: nextConfiguration,
      },
    });

    return { ok: true };
  },

  hasPermission: (permissionCode) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.permissionCodes.includes('*')) return true;
    return user.permissionCodes.includes(permissionCode);
  },

  addStaff: (input) => {
    const name = input.name.trim();
    const identifier = normalizeIdentifier(input.identifier);
    const pin = input.pin.trim();

    if (!name) {
      return { ok: false, error: 'Le nom est obligatoire.' };
    }

    if (!identifier) {
      return { ok: false, error: 'L’identifiant est obligatoire.' };
    }

    if (pin.length < 4) {
      return { ok: false, error: 'Le PIN doit contenir au moins 4 chiffres.' };
    }

    const alreadyExists = get().users.some((u) => u.identifier === identifier);
    if (alreadyExists) {
      return { ok: false, error: 'Cet identifiant existe déjà.' };
    }

    const newUser: User = {
      id: uuid.v4() as string,
      name,
      identifier,
      pin,
      role: input.role,
      permissionCodes: getDefaultPermissionCodes(input.role),
      isActive: true,
      createdAt: nowIso(),
    };

    set((state) => ({
      users: [...state.users, newUser],
    }));

    return { ok: true };
  },

  removeStaff: (userId) => {
    const currentUser = get().currentUser;

    set((state) => {
      const userToRemove = state.users.find((u) => u.id === userId);

      if (currentUser?.id === userId) {
        return state;
      }

      if (userToRemove?.role === 'manager' || userToRemove?.role === 'admin') {
        const managerCount = state.users.filter(
          (u) =>
            (u.role === 'manager' || u.role === 'admin') &&
            u.id !== userId
        ).length;

        if (managerCount === 0) {
          return state;
        }
      }

      return {
        users: state.users.filter((u) => u.id !== userId),
      };
    });
  },

  toggleStaffActive: (userId) => {
    const currentUser = get().currentUser;

    set((state) => {
      const target = state.users.find((u) => u.id === userId);
      if (!target) return state;

      if (currentUser?.id === userId) {
        return state;
      }

      if ((target.role === 'manager' || target.role === 'admin') && target.isActive) {
        const activeManagersLeft = state.users.filter(
          (u) =>
            (u.role === 'manager' || u.role === 'admin') &&
            u.isActive &&
            u.id !== userId
        ).length;

        if (activeManagersLeft === 0) {
          return state;
        }
      }

      return {
        users: state.users.map((u) =>
          u.id === userId ? { ...u, isActive: !u.isActive } : u
        ),
      };
    });
  },

  updateStaffPin: (userId, newPin) => {
    const pin = newPin.trim();

    if (pin.length < 4) {
      return { ok: false, error: 'Le PIN doit contenir au moins 4 chiffres.' };
    }

    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, pin } : u
      ),
    }));

    return { ok: true };
  },

  zones: [],
  tables: [],

  addTablesForZone: (zoneName, count) => {
    const normalizedZone = zoneName.trim();

    if (!normalizedZone) {
      return { ok: false, error: 'Le nom de la zone est obligatoire.' };
    }

    if (!Number.isInteger(count) || count <= 0) {
      return { ok: false, error: 'Le nombre de tables est invalide.' };
    }

    const config = get().establishment?.configuration ?? defaultConfiguration();
    const existingZone = get().zones.find(
      (z) => z.name.toLowerCase() === normalizedZone.toLowerCase()
    );

    const zone: Zone =
      existingZone ??
      {
        id: uuid.v4() as string,
        name: normalizedZone,
        isActive: true,
      };

    const sameZoneTables = get().tables.filter((t) => t.zoneId === zone.id);
    const maxExisting = sameZoneTables.length;

    const newTables: Table[] = Array.from({ length: count }).map((_, index) => ({
      id: uuid.v4() as string,
      name: config.usesNumberedTables
        ? `${normalizedZone} ${maxExisting + index + 1}`
        : normalizedZone,
      zoneId: zone.id,
      status: 'free',
      isActive: true,
    }));

    set((state) => ({
      zones: existingZone ? state.zones : [...state.zones, zone],
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
      (t) => t.id !== tableId && t.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (alreadyExists) {
      return { ok: false, error: 'Une table avec ce nom existe déjà.' };
    }

    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, name: normalizedName } : t
      ),
    }));

    return { ok: true };
  },

  removeTable: (tableId) => {
    const hasOpenOrder = get().orders.some(
      (o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status)
    );

    if (hasOpenOrder) {
      return {
        ok: false,
        error: 'Impossible de supprimer une table avec une facture en cours.',
      };
    }

    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
    }));

    return { ok: true };
  },

  productCategories: [],
  products: [],

  addProduct: (input) => {
    const name = input.name.trim();
    const price = Number(input.price);

    if (!name) {
      return { ok: false, error: 'Le nom du produit est obligatoire.' };
    }

    if (Number.isNaN(price) || price < 0) {
      return { ok: false, error: 'Le prix est invalide.' };
    }

    const newProduct: Product = {
      id: uuid.v4() as string,
      name,
      price,
      categoryId: input.categoryId ?? null,
      categoryNameSnapshot: input.categoryNameSnapshot ?? null,
      barcode: input.barcode ?? null,
      isBarcodeBased: input.isBarcodeBased ?? false,
      isActive: true,
    };

    set((state) => ({
      products: [...state.products, newProduct],
    }));

    return { ok: true };
  },

  removeProduct: (productId) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== productId),
    }));
  },

  orders: [],

  getOrderForTable: (tableId) => {
    return get().orders.find(
      (o) =>
        o.tableId === tableId &&
        !['paid', 'cancelled'].includes(o.status)
    );
  },

  getOrdersForTable: (tableId) => {
    return get().orders.filter(
      (o) =>
        o.tableId === tableId &&
        !['paid', 'cancelled'].includes(o.status)
    );
  },

  createOrder: (tableId, userId, options) => {
    const establishment = get().establishment;
    const table = get().tables.find((t) => t.id === tableId);

    let sourceType: SaleSourceType = 'free';
    let zoneId: string | null = options?.zoneId ?? null;

    if (options?.sourceType) {
      sourceType = options.sourceType;
    } else if (tableId) {
      sourceType = 'table';
      zoneId = table?.zoneId ?? null;
    } else if (establishment?.configuration.hasCounter) {
      sourceType = 'counter';
    } else if (zoneId) {
      sourceType = 'zone';
    } else {
      sourceType = 'free';
    }

    const sale: Sale = {
      id: uuid.v4() as string,
      sourceType,
      zoneId,
      tableId,
      reference: buildReference(),
      status: 'draft',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      createdByUserId: userId,
      moneyCollectedByUserId: null,
      moneyCollectedAt: null,
      sentAt: null,
      items: [],
      subtotal: 0,
      total: 0,
      payment: null,
      cancellationReason: null,
      cancelledByUserId: null,
      cancelledAt: null,
    };

    const nextOrders = [sale, ...get().orders];

    set({
      orders: nextOrders,
      tables: get().tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: saleStatusToTableStatus(
                nextOrders.filter((o) => o.tableId === tableId)
              ),
            }
          : t
      ),
    });

    return sale;
  },

  addItemToOrder: (orderId, product) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = { ...orders[idx] };
    const existingIdx = order.items.findIndex((i) => i.productId === product.id);

    let newItems: SaleItem[];

    if (existingIdx >= 0) {
      newItems = order.items.map((item, i) =>
        i === existingIdx
          ? {
              ...item,
              quantity: item.quantity + 1,
              lineTotal: (item.quantity + 1) * item.unitPriceSnapshot,
            }
          : item
      );
    } else {
      const newItem: SaleItem = {
        id: uuid.v4() as string,
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: 1,
        lineTotal: product.price,
      };
      newItems = [...order.items, newItem];
    }

    const updated = recalcSale({
      ...order,
      items: newItems,
      updatedAt: nowIso(),
    });

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({ orders: newOrders });
  },

  updateItemQuantity: (orderId, itemId, quantity) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];
    let newItems: SaleItem[];

    if (quantity <= 0) {
      newItems = order.items.filter((i) => i.id !== itemId);
    } else {
      newItems = order.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              quantity,
              lineTotal: quantity * i.unitPriceSnapshot,
            }
          : i
      );
    }

    const updated = recalcSale({
      ...order,
      items: newItems,
      updatedAt: nowIso(),
    });

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({ orders: newOrders });
  },

  removeItem: (orderId, itemId) => {
    get().updateItemQuantity(orderId, itemId, 0);
  },

  setOrderStatus: (orderId, status) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const mappedStatus: SaleDocumentStatus =
      status === 'open'
        ? 'draft'
        : status === 'waiting_payment'
        ? 'sent'
        : status;

    const order = orders[idx];

    const updated: Sale = {
      ...order,
      status: mappedStatus,
      updatedAt: nowIso(),
      sentAt: mappedStatus === 'sent' ? nowIso() : order.sentAt,
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId
          ? {
              ...t,
              status: saleStatusToTableStatus(
                newOrders.filter((o) => o.tableId === order.tableId)
              ),
            }
          : t
      ),
    });
  },

  markOrderAsSent: (orderId) => {
    get().setOrderStatus(orderId, 'sent');
  },

  markMoneyCollected: (orderId, userId) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];

    const updated: Sale = {
      ...order,
      status: 'money_collected',
      moneyCollectedByUserId: userId,
      moneyCollectedAt: nowIso(),
      updatedAt: nowIso(),
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId
          ? {
              ...t,
              status: saleStatusToTableStatus(
                newOrders.filter((o) => o.tableId === order.tableId)
              ),
            }
          : t
      ),
    });
  },

  payOrder: (orderId, method, amountReceived, cashierUserId) => {
    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const order = orders[idx];
    const changeGiven = amountReceived - order.total;
    const paidAt = nowIso();

    const updated: Sale = {
      ...order,
      status: 'paid',
      updatedAt: paidAt,
      payment: {
        id: uuid.v4() as string,
        saleId: order.id,
        method,
        amountReceived,
        changeGiven: Math.max(0, changeGiven),
        paidAt,
        validatedByUserId: cashierUserId,
      },
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId
          ? {
              ...t,
              status: saleStatusToTableStatus(
                newOrders.filter((o) => o.tableId === order.tableId)
              ),
            }
          : t
      ),
    });
  },

  cancelOrder: (orderId, cancelledByUserId, reason) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      return { ok: false, error: 'Le motif est obligatoire.' };
    }

    const orders = get().orders;
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return { ok: false, error: 'Facture introuvable.' };
    }

    const order = orders[idx];

    if (order.status === 'paid') {
      return { ok: false, error: 'Une facture payée ne peut pas être annulée ici.' };
    }

    const updated: Sale = {
      ...order,
      status: 'cancelled',
      updatedAt: nowIso(),
      cancellationReason: normalizedReason,
      cancelledByUserId,
      cancelledAt: nowIso(),
    };

    const newOrders = [...orders];
    newOrders[idx] = updated;

    set({
      orders: newOrders,
      tables: get().tables.map((t) =>
        t.id === order.tableId
          ? {
              ...t,
              status: saleStatusToTableStatus(
                newOrders.filter((o) => o.tableId === order.tableId)
              ),
            }
          : t
      ),
    });

    return { ok: true };
  },

  shifts: [],

  getOpenShiftForCashier: (cashierUserId) => {
    return get().shifts.find(
      (s) => s.cashierUserId === cashierUserId && s.status === 'open'
    );
  },

  openShift: (cashierUserId, initialStock) => {
    const existing = get().getOpenShiftForCashier(cashierUserId);
    if (existing) {
      return { ok: false, error: 'Un shift est déjà ouvert pour cette caissière.' };
    }

    const shift: Shift = {
      id: uuid.v4() as string,
      cashierUserId,
      openedAt: nowIso(),
      closedAt: null,
      status: 'open',
      initialStock,
      finalStock: [],
      salesCount: 0,
      totalPaidAmount: 0,
      differenceLines: [],
    };

    set((state) => ({
      shifts: [shift, ...state.shifts],
    }));

    return { ok: true };
  },

  closeShift: (cashierUserId, finalStock) => {
    const shifts = get().shifts;
    const idx = shifts.findIndex(
      (s) => s.cashierUserId === cashierUserId && s.status === 'open'
    );

    if (idx === -1) {
      return { ok: false, error: 'Aucun shift ouvert pour cette caissière.' };
    }

    const shift = shifts[idx];
    const paidSales = get().orders.filter(
      (o) =>
        o.status === 'paid' &&
        o.payment?.validatedByUserId === cashierUserId &&
        o.payment?.paidAt >= shift.openedAt
    );

    const differenceLines = computeShiftDifferenceLines(
      shift.initialStock,
      finalStock,
      paidSales
    );

    const updated: Shift = {
      ...shift,
      status: 'closed',
      closedAt: nowIso(),
      finalStock,
      salesCount: paidSales.length,
      totalPaidAmount: paidSales.reduce((sum, s) => sum + s.total, 0),
      differenceLines,
    };

    const newShifts = [...shifts];
    newShifts[idx] = updated;

    set({ shifts: newShifts });

    return { ok: true };
  },

  isPro: () => get().establishment?.plan === 'pro',

  activatePro: (code) => {
    const normalized = code.trim().toUpperCase();

    if (!PRO_ACTIVATION_CODES.includes(normalized)) {
      return false;
    }

    const current = get().establishment;
    const now = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);

    set({
      establishment: current
        ? {
            ...current,
            plan: 'pro' as AppPlan,
            planActivatedAt: now.toISOString(),
            planExpiresAt: expires.toISOString(),
          }
        : {
            id: uuid.v4() as string,
            name: 'Mon établissement',
            city: null,
            isSetupComplete: false,
            configuration: defaultConfiguration(),
            plan: 'pro',
            planActivatedAt: now.toISOString(),
            planExpiresAt: expires.toISOString(),
          },
    });

    return true;
  },

  initApp: () => {
    try {
      DB.initDB?.();
    } catch {}

    let dbProducts: Product[] = [];

    try {
      dbProducts = DB.getProducts?.() ?? [];
    } catch {}

    set((state) => ({
      products: state.products.length > 0 ? state.products : dbProducts,
    }));
  },

  refreshTables: () => {
    set({ tables: [...get().tables] });
  },

  refreshProducts: () => {
    try {
      const dbProducts = DB.getProducts?.() ?? [];
      set({ products: dbProducts.length > 0 ? dbProducts : [...get().products] });
    } catch {
      set({ products: [...get().products] });
    }
  },

  refreshOrders: () => {
    set({ orders: [...get().orders] });
  },
}));