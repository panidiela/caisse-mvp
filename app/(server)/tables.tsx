import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { canAccessServer } from '../../src/utils/access';
import { SaleSourceType, Table, Zone } from '../../src/types';

const STATUS_LABEL: Record<string, string> = {
  free: 'Libre',
  occupied: 'Occupée',
  attention: 'Attention',
};

const STATUS_COLOR: Record<string, string> = {
  free: COLORS.free,
  occupied: COLORS.occupied,
  attention: COLORS.warning,
};

export default function TablesScreen() {
  const router = useRouter();
  const {
    tables,
    zones,
    currentUser,
    establishment,
    getOrdersForTable,
    createOrder,
    orders,
  } = useStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }

    if (!canAccessServer(currentUser)) {
      Alert.alert('Accès refusé', 'Cet écran est réservé au service en salle.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [currentUser, router]);

  if (!currentUser || !canAccessServer(currentUser) || !establishment) return null;

  const config = establishment.configuration;

  const activeZones = useMemo(
    () => zones.filter((z) => z.isActive),
    [zones]
  );

  const activeTables = useMemo(
    () => tables.filter((t) => t.isActive),
    [tables]
  );

  const groupedTables = useMemo(() => {
    const result = activeZones
      .map((zone) => ({
        zoneId: zone.id,
        zoneName: zone.name,
        tables: activeTables.filter((t) => t.zoneId === zone.id),
      }))
      .filter((group) => group.tables.length > 0);

    const noZoneTables = activeTables.filter((t) => !t.zoneId);

    if (noZoneTables.length > 0) {
      result.push({
        zoneId: 'no-zone',
        zoneName: 'Tables',
        tables: noZoneTables,
      });
    }

    return result;
  }, [activeZones, activeTables]);

  const zoneCards = useMemo(() => {
    return activeZones.map((zone) => {
      const zoneSales = orders.filter(
        (o) =>
          o.zoneId === zone.id &&
          !['paid', 'cancelled'].includes(o.status)
      );

      return {
        ...zone,
        activeSalesCount: zoneSales.length,
      };
    });
  }, [activeZones, orders]);

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  const openOrder = (
    orderId: string,
    tableId: string | null,
    sourceType: SaleSourceType,
    zoneId?: string | null
  ) => {
    router.push({
      pathname: '/(server)/order',
      params: {
        orderId,
        tableId: tableId ?? '',
        sourceType,
        zoneId: zoneId ?? '',
      },
    });
  };

  const handleCreateCounterSale = () => {
    const order = createOrder(null, currentUser.id, {
      sourceType: 'counter',
      zoneId: null,
    });

    openOrder(order.id, null, 'counter', null);
  };

  const handleCreateFreeSale = () => {
    const order = createOrder(null, currentUser.id, {
      sourceType: 'free',
      zoneId: null,
    });

    openOrder(order.id, null, 'free', null);
  };

  const handleZonePress = (zone: Zone) => {
    const zoneOrders = orders
      .filter(
        (o) =>
          o.zoneId === zone.id &&
          o.sourceType === 'zone' &&
          !['paid', 'cancelled'].includes(o.status)
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    if (zoneOrders.length === 0) {
      const order = createOrder(null, currentUser.id, {
        sourceType: 'zone',
        zoneId: zone.id,
      });

      openOrder(order.id, null, 'zone', zone.id);
      return;
    }

    if (zoneOrders.length === 1) {
      openOrder(zoneOrders[0].id, null, 'zone', zone.id);
      return;
    }

    Alert.alert(
      zone.name,
      'Cette zone a plusieurs factures ouvertes. Pour l’instant, on ouvre la plus récente.',
      [
        {
          text: 'OK',
          onPress: () => {
            openOrder(zoneOrders[0].id, null, 'zone', zone.id);
          },
        },
      ]
    );
  };

  const handleCreateAdditionalZoneBill = (zone: Zone) => {
    const order = createOrder(null, currentUser.id, {
      sourceType: 'zone',
      zoneId: zone.id,
    });

    openOrder(order.id, null, 'zone', zone.id);
  };

  const handleTablePress = (table: Table) => {
    const activeOrders = getOrdersForTable(table.id);

    if (activeOrders.length === 0) {
      const order = createOrder(table.id, currentUser.id, {
        sourceType: 'table',
        zoneId: table.zoneId,
      });

      openOrder(order.id, table.id, 'table', table.zoneId);
      return;
    }

    if (activeOrders.length === 1) {
      openOrder(activeOrders[0].id, table.id, 'table', table.zoneId);
      return;
    }

    Alert.alert(
      table.name,
      'Cette table a plusieurs factures ouvertes. Pour l’instant, on ouvre la plus récente.',
      [
        {
          text: 'OK',
          onPress: () => {
            const latestOrder = [...activeOrders].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )[0];

            openOrder(latestOrder.id, table.id, 'table', table.zoneId);
          },
        },
      ]
    );
  };

  const handleCreateAdditionalBill = (table: Table) => {
    const order = createOrder(table.id, currentUser.id, {
      sourceType: 'table',
      zoneId: table.zoneId,
    });

    openOrder(order.id, table.id, 'table', table.zoneId);
  };

  const renderTopQuickActions = () => {
    return (
      <View style={s.quickActions}>
        {config.hasCounter && (
          <TouchableOpacity style={s.quickCardPrimary} onPress={handleCreateCounterSale}>
            <Text style={s.quickCardTitle}>Comptoir</Text>
            <Text style={s.quickCardText}>Créer une vente comptoir</Text>
          </TouchableOpacity>
        )}

        {!config.usesTables && !config.usesZones && (
          <TouchableOpacity style={s.quickCardSecondary} onPress={handleCreateFreeSale}>
            <Text style={s.quickCardSecondaryTitle}>Nouvelle facture</Text>
            <Text style={s.quickCardSecondaryText}>
              Vente libre sans table ni zone
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderZoneCard = (zone: Zone & { activeSalesCount: number }) => {
    return (
      <TouchableOpacity
        key={zone.id}
        style={s.zoneCard}
        onPress={() => handleZonePress(zone)}
        activeOpacity={0.85}
      >
        <Text style={s.zoneCardTitle}>{zone.name}</Text>
        <Text style={s.zoneCardText}>
          {zone.activeSalesCount === 0
            ? 'Aucune facture ouverte'
            : zone.activeSalesCount === 1
            ? '1 facture ouverte'
            : `${zone.activeSalesCount} factures ouvertes`}
        </Text>

        <View style={s.zoneCardActions}>
          <TouchableOpacity
            style={s.zoneOpenBtn}
            onPress={() => handleZonePress(zone)}
          >
            <Text style={s.zoneOpenBtnText}>
              {zone.activeSalesCount > 0 ? 'Ouvrir' : 'Créer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.zoneNewBtn}
            onPress={() => handleCreateAdditionalZoneBill(zone)}
          >
            <Text style={s.zoneNewBtnText}>+ Facture</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTableCard = (table: Table) => {
    const activeOrders = getOrdersForTable(table.id);

    return (
      <TouchableOpacity
        key={table.id}
        style={[s.card, { borderTopColor: STATUS_COLOR[table.status] }]}
        onPress={() => handleTablePress(table)}
        activeOpacity={0.85}
      >
        <View style={s.cardTop}>
          <Text style={s.tableName}>{table.name}</Text>
          <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[table.status] }]} />
        </View>

        <Text style={[s.statusLabel, { color: STATUS_COLOR[table.status] }]}>
          {STATUS_LABEL[table.status]}
        </Text>

        <Text style={s.billCount}>
          {activeOrders.length === 0
            ? 'Aucune facture ouverte'
            : activeOrders.length === 1
            ? '1 facture ouverte'
            : `${activeOrders.length} factures ouvertes`}
        </Text>

        <View style={s.cardActions}>
          <TouchableOpacity
            style={s.openBtn}
            onPress={() => handleTablePress(table)}
          >
            <Text style={s.openBtnText}>
              {activeOrders.length > 0 ? 'Ouvrir' : 'Créer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.newBillBtn}
            onPress={() => handleCreateAdditionalBill(table)}
          >
            <Text style={s.newBillBtnText}>+ Facture</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    // Cas 1 : ni zone ni table -> service libre pur
    if (!config.usesZones && !config.usesTables) {
      return (
        <View style={s.simpleModeBlock}>
          <Text style={s.simpleModeTitle}>Service libre</Text>
          <Text style={s.simpleModeText}>
            Ici, les serveurs peuvent créer des factures librement sans table ni zone.
          </Text>

          <TouchableOpacity style={s.freeSaleBtn} onPress={handleCreateFreeSale}>
            <Text style={s.freeSaleBtnText}>+ Nouvelle facture libre</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Cas 2 : zones sans tables
    if (config.usesZones && !config.usesTables) {
      return (
        <View style={s.zoneBlock}>
          <Text style={s.sectionTitle}>Zones</Text>
          <View style={s.zoneGrid}>
            {zoneCards.map((zone) => renderZoneCard(zone))}
          </View>
        </View>
      );
    }

    // Cas 3 : tables sans zones
    if (!config.usesZones && config.usesTables) {
      return (
        <View style={s.zoneBlock}>
          <Text style={s.sectionTitle}>Tables</Text>
          <View style={s.grid}>
            {activeTables.map((table) => renderTableCard(table))}
          </View>
        </View>
      );
    }

    // Cas 4 : zones + tables
    return (
      <>
        {groupedTables.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Aucune table configurée</Text>
            <Text style={s.emptyText}>
              Demande au manager d’ajouter des zones et des tables dans les réglages.
            </Text>
          </View>
        ) : (
          groupedTables.map((group) => (
            <View key={group.zoneId} style={s.zoneBlock}>
              <Text style={s.sectionTitle}>{group.zoneName}</Text>

              <View style={s.grid}>
                {group.tables.map((table) => renderTableCard(table))}
              </View>
            </View>
          ))
        )}
      </>
    );
  };

  return (
    <Screen
      title={`Service · ${currentUser.name}`}
      rightAction={{ label: 'Déco', onPress: handleLogout }}
    >
      <ScrollView contentContainerStyle={s.content}>
        {renderTopQuickActions()}
        {renderBody()}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 32,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  quickCardPrimary: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.md,
  },

  quickCardSecondary: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },

  quickCardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  quickCardText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  quickCardSecondaryTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },

  quickCardSecondaryText: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },

  zoneBlock: {
    gap: 12,
  },

  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  zoneCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.md,
  },

  zoneCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  zoneCardText: {
    fontSize: 13,
    color: COLORS.textLight,
    minHeight: 36,
  },

  zoneCardActions: {
    flexDirection: 'row',
    gap: 8,
  },

  zoneOpenBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },

  zoneOpenBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },

  zoneNewBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  zoneNewBtnText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderTopWidth: 6,
    padding: 14,
    gap: 8,
    ...SHADOW.md,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },

  tableName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginTop: 4,
  },

  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  billCount: {
    fontSize: 12,
    color: COLORS.textLight,
    minHeight: 32,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  openBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },

  openBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },

  newBillBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  newBillBtnText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 12,
  },

  simpleModeBlock: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 12,
    ...SHADOW.md,
  },

  simpleModeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },

  simpleModeText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },

  freeSaleBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },

  freeSaleBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});