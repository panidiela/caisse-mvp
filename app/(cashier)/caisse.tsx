import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, formatTime } from '../../src/utils/format';
import { canAccessCashier } from '../../src/utils/access';
import { Sale } from '../../src/types';

export default function CaisseScreen() {
  const router = useRouter();
  const {
    orders,
    tables,
    zones,
    currentUser,
    createOrder,
    payOrder,
    establishment,
  } = useStore();

  const [tab, setTab] = useState<'to_process' | 'paid'>('to_process');

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

  if (!currentUser || !canAccessCashier(currentUser) || !establishment) {
    return null;
  }

  const config = establishment.configuration;

  const toProcess = useMemo(() => {
    return orders
      .filter((o) => o.status === 'open' || o.status === 'waiting_payment')
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [orders]);

  const paidOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'paid')
      .sort((a, b) => {
        const aDate = a.payment?.paidAt ?? a.updatedAt;
        const bDate = b.payment?.paidAt ?? b.updatedAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }, [orders]);

  const handleCounterSale = () => {
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

  const handleConfirmPayment = (item: Sale) => {
    if (item.status !== 'waiting_payment') {
      Alert.alert(
        'Paiement impossible',
        'La vente doit d’abord être marquée comme prête au paiement par le service.'
      );
      return;
    }

    Alert.alert(
      'Valider le paiement ?',
      `Confirmer l’encaissement de ${formatPrice(item.total)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            payOrder(item.id, 'cash', item.total, currentUser.id);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  const getStatusLabel = (status: string) => {
    if (status === 'open') return '📝 En cours';
    if (status === 'waiting_payment') return '⏳ À encaisser';
    if (status === 'paid') return '✅ Payée';
    if (status === 'cancelled') return '❌ Annulée';
    return '📄 Vente';
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return COLORS.occupied;
    if (status === 'waiting_payment') return COLORS.warning;
    if (status === 'paid') return COLORS.success;
    if (status === 'cancelled') return COLORS.danger;
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
    const canValidate = item.status === 'waiting_payment';

    return (
      <View style={s.card}>
        <TouchableOpacity
          onPress={() => handleOpenOrder(item)}
          activeOpacity={0.85}
        >
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>
                Vente #{item.id.slice(0, 8).toUpperCase()}
              </Text>
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

        {canValidate && (
          <TouchableOpacity
            style={s.validateBtn}
            onPress={() => handleConfirmPayment(item)}
          >
            <Text style={s.validateBtnText}>Valider paiement</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const data = tab === 'to_process' ? toProcess : paidOrders;

  return (
    <Screen
      title={`Caisse · ${currentUser.name}`}
      rightAction={{ label: 'Déco', onPress: handleLogout }}
    >
      <View style={s.container}>
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
        </View>

        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'to_process' && s.tabBtnActive]}
            onPress={() => setTab('to_process')}
          >
            <Text
              style={[s.tabText, tab === 'to_process' && s.tabTextActive]}
            >
              À traiter
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabBtn, tab === 'paid' && s.tabBtnActive]}
            onPress={() => setTab('paid')}
          >
            <Text style={[s.tabText, tab === 'paid' && s.tabTextActive]}>
              Payées
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                {tab === 'to_process'
                  ? 'Aucune vente à traiter'
                  : 'Aucune vente payée'}
              </Text>
              <Text style={s.emptyText}>
                {tab === 'to_process'
                  ? 'Les ventes en cours ou en attente de paiement apparaîtront ici.'
                  : 'L’historique des ventes payées apparaîtra ici.'}
              </Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexWrap: 'wrap',
  },
  counterBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.md,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  freeBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.md,
  },
  freeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardSource: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardItems: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  openHint: {
    color: COLORS.textLight,
    fontWeight: '700',
  },
  validateBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  validateBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});