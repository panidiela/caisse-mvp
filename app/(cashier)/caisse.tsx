import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, formatTime } from '../../src/utils/format';
import { Order } from '../../src/types';
import { canAccessCashier, canCreateCounterOrder } from '../../src/utils/access';

export default function CaisseScreen() {
  const router = useRouter();
  const { orders, currentUser, createOrder } = useStore();
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
  }, [currentUser]);

  if (!currentUser || !canAccessCashier(currentUser)) return null;

  // 🔥 LISTES
  const pending = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'waiting_payment' || o.status === 'open')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [orders]
  );

  const paid = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'paid')
        .sort((a, b) => new Date(b.payment!.paidAt).getTime() - new Date(a.payment!.paidAt).getTime()),
    [orders]
  );

  // 🔥 ACTION : VENTE COMPTOIR
  const handleCounterSale = () => {
    if (!canCreateCounterOrder(currentUser)) {
      Alert.alert('Accès refusé');
      return;
    }

    const order = createOrder(null, currentUser.id);

    router.push({
      pathname: '/(server)/order',
      params: {
        orderId: order.id,
        tableId: '',
      },
    });
  };

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const isWaiting = item.status === 'waiting_payment';
    const isPaid = item.status === 'paid';

    return (
      <TouchableOpacity
        style={[s.card, isWaiting && s.cardWaiting, isPaid && s.cardPaid]}
        onPress={() =>
          router.push({
            pathname: '/(cashier)/payment',
            params: { orderId: item.id },
          })
        }
        activeOpacity={0.8}
      >
        <View style={s.cardHeader}>
          <Text style={s.cardTable}>
            {item.tableId ? 'Commande table' : 'Comptoir'}
          </Text>
          <Text style={s.cardTime}>{formatTime(item.updatedAt)}</Text>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.cardItems}>{item.items.length} article(s)</Text>
          <Text style={s.cardTotal}>{formatPrice(item.total)}</Text>
        </View>

        <View
          style={[
            s.statusPill,
            {
              backgroundColor: isWaiting
                ? COLORS.warning
                : isPaid
                ? COLORS.success
                : COLORS.occupied,
            },
          ]}
        >
          <Text style={s.statusPillText}>
            {isWaiting ? '⏳ Addition' : isPaid ? '✅ Payée' : '🍽️ En cours'}
          </Text>
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
      {/* 🔥 BOUTON COMPTOIR */}
      <TouchableOpacity style={s.counterBtn} onPress={handleCounterSale}>
        <Text style={s.counterText}>+ Vente comptoir</Text>
      </TouchableOpacity>

      {/* TABS */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'pending' && s.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[s.tabText, tab === 'pending' && s.tabTextActive]}>
            À encaisser ({pending.length})
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
                ? '🎉 Aucune commande'
                : '📋 Aucun historique'}
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  counterBtn: {
    backgroundColor: COLORS.primary,
    margin: 16,
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

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textLight, fontWeight: '700' },
  tabTextActive: { color: COLORS.primary },

  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.md,
  },

  cardWaiting: {},
  cardPaid: { opacity: 0.9 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cardTable: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
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