import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, formatTime } from '../../src/utils/format';
import { canAccessCashier, canCreateCounterOrder } from '../../src/utils/access';
import { Sale } from '../../src/types';

export default function CaisseScreen() {
  const router = useRouter();
  const {
    orders,
    tables,
    zones,
    currentUser,
    createOrder,
    getOpenShiftForCashier,
    establishment,
  } = useStore();

  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }

    if (!canAccessCashier(currentUser)) {
      Alert.alert('Accès refusé', 'Cet écran est réservé à la caisse.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [currentUser, router]);

  if (!currentUser || !canAccessCashier(currentUser) || !establishment) return null;

  const config = establishment.configuration;
  const openShift = getOpenShiftForCashier(currentUser.id);

  const pending = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status === 'draft' ||
          o.status === 'sent' ||
          o.status === 'money_collected'
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [orders]);

  const paid = useMemo(() => {
    return orders
      .filter((o) => o.status === 'paid')
      .sort((a, b) => {
        const aDate = a.payment?.paidAt ?? a.updatedAt;
        const bDate = b.payment?.paidAt ?? b.updatedAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [orders]);

  const handleCounterSale = () => {
    if (!openShift) {
      Alert.alert(
        'Shift requis',
        'Ouvre d’abord ton shift de caisse avant de créer une vente comptoir.'
      );
      return;
    }

    if (!canCreateCounterOrder(currentUser)) {
      Alert.alert('Accès refusé');
      return;
    }

    const order = createOrder(null, currentUser.id, {
      sourceType: 'counter',
      zoneId: null,
    });

    router.push({
      pathname: '/(server)/order',
      params: {
        orderId: order.id,
        tableId: '',
        zoneId: '',
        sourceType: 'counter',
      },
    });
  };

  const handleFreeSale = () => {
    if (!openShift) {
      Alert.alert(
        'Shift requis',
        'Ouvre d’abord ton shift de caisse avant de créer une vente libre.'
      );
      return;
    }

    const order = createOrder(null, currentUser.id, {
      sourceType: 'free',
      zoneId: null,
    });

    router.push({
      pathname: '/(server)/order',
      params: {
        orderId: order.id,
        tableId: '',
        zoneId: '',
        sourceType: 'free',
      },
    });
  };

  const handleOpenOrder = (item: Sale) => {
    if (!openShift && item.status !== 'paid') {
      Alert.alert(
        'Shift requis',
        'Ouvre d’abord ton shift de caisse avant de traiter des factures.'
      );
      return;
    }

    if (
      item.status === 'paid' ||
      item.status === 'sent' ||
      item.status === 'money_collected'
    ) {
      router.push({
        pathname: '/(cashier)/payment',
        params: { orderId: item.id },
      });
      return;
    }

    router.push({
      pathname: '/(server)/order',
      params: {
        orderId: item.id,
        tableId: item.tableId ?? '',
        zoneId: item.zoneId ?? '',
        sourceType: item.sourceType,
      },
    });
  };

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  const getStatusLabel = (status: string) => {
    if (status === 'draft') return '📝 Brouillon';
    if (status === 'sent') return '⏳ Envoyée';
    if (status === 'money_collected') return '💵 Argent reçu';
    if (status === 'paid') return '✅ Payée';
    return '📄 Facture';
  };

  const getStatusColor = (status: string) => {
    if (status === 'draft') return COLORS.occupied;
    if (status === 'sent') return COLORS.warning;
    if (status === 'money_collected') return COLORS.primary;
    if (status === 'paid') return COLORS.success;
    return COLORS.textLight;
  };

  const getSourceLabel = (order: Sale) => {
    if (order.sourceType === 'counter') return '🧾 Comptoir';

    if (order.sourceType === 'zone') {
      const zone = zones.find((z) => z.id === order.zoneId);
      return zone ? `📍 ${zone.name}` : '📍 Zone';
    }

    if (order.sourceType === 'table') {
      const table = tables.find((t) => t.id === order.tableId);
      return table ? `🪑 ${table.name}` : '🪑 Table';
    }

    return '📄 Libre';
  };

  const renderOrder = ({ item }: { item: Sale }) => {
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleOpenOrder(item)}
        activeOpacity={0.85}
      >
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.reference}</Text>
            <Text style={s.cardSource}>{getSourceLabel(item)}</Text>
          </View>
          <Text style={s.cardTime}>{formatTime(item.updatedAt)}</Text>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.cardItems}>{item.items.length} article(s)</Text>
          <Text style={s.cardTotal}>{formatPrice(item.total)}</Text>
        </View>

        <View style={s.bottomRow}>
          <View
            style={[
              s.statusPill,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
          </View>

          <Text style={s.openHint}>Ouvrir ›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const data = tab === 'pending' ? pending : paid;

  return (
    <Screen
      title={`Caisse · ${currentUser.name}`}
      rightAction={{ label: 'Déco', onPress: handleLogout }}
    >
      <View style={s.topActions}>
        {config.hasCounter && (
          <TouchableOpacity style={s.counterBtn} onPress={handleCounterSale}>
            <Text style={s.counterText}>+ Vente comptoir</Text>
          </TouchableOpacity>
        )}

        {!config.usesTables && !config.usesZones && (
          <TouchableOpacity style={s.freeBtn} onPress={handleFreeSale}>
            <Text style={s.freeText}>+ Vente libre</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.shiftBtn, openShift && s.shiftBtnOpen]}
          onPress={() => router.push('/(cashier)/shift')}
        >
          <Text style={s.shiftText}>
            {openShift ? 'Shift ouvert' : 'Gérer shift'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'pending' && s.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[s.tabText, tab === 'pending' && s.tabTextActive]}>
            À traiter ({pending.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, tab === 'history' && s.tabActive]}
          onPress={() => setTab('history')}
        >
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>
            Historique ({paid.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(o) => o.id}
        renderItem={renderOrder}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {tab === 'pending'
                ? '🎉 Aucune facture à traiter'
                : '📋 Aucun historique'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  topActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexWrap: 'wrap',
  },

  counterBtn: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOW.md,
  },

  counterText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  freeBtn: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },

  freeText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
  },

  shiftBtn: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  shiftBtnOpen: {
    backgroundColor: COLORS.success + '15',
    borderColor: COLORS.success,
  },

  shiftText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 15,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 12,
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },

  tabText: {
    color: COLORS.textLight,
    fontWeight: '700',
  },

  tabTextActive: {
    color: COLORS.primary,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.md,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  cardSource: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
  },

  cardTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cardItems: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  cardTotal: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusPillText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },

  openHint: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 13,
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyText: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
});