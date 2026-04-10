import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { Table } from '../../src/types';
import { canAccessServer } from '../../src/utils/access';

const STATUS_LABEL: Record<string, string> = {
  free: 'Libre',
  occupied: 'Occupée',
  waiting_payment: 'Addition',
  paid: 'Payée',
};

const STATUS_COLOR: Record<string, string> = {
  free: COLORS.free,
  occupied: COLORS.occupied,
  waiting_payment: COLORS.warning,
  paid: COLORS.paid,
};

export default function TablesScreen() {
  const router = useRouter();
  const { tables, currentUser, getOrderForTable, createOrder } = useStore();

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
  }, [currentUser]);

  if (!currentUser || !canAccessServer(currentUser)) return null;

  const handleTablePress = (table: Table) => {
    const existingOrder = getOrderForTable(table.id);
    if (existingOrder) {
      router.push({ pathname: '/(server)/order', params: { orderId: existingOrder.id, tableId: table.id } });
      return;
    }

    if (table.status === 'waiting_payment') {
      Alert.alert('Addition demandée', 'Cette table attend le paiement.');
      return;
    }

    const order = createOrder(table.id, currentUser.id);
    router.push({ pathname: '/(server)/order', params: { orderId: order.id, tableId: table.id } });
  };

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  return (
    <Screen
      title={`Tables · ${currentUser.name}`}
      rightAction={{ label: 'Déco', onPress: handleLogout }}
    >
      <ScrollView contentContainerStyle={s.grid}>
        {tables.filter((t) => t.isActive).map((table) => (
          <TouchableOpacity
            key={table.id}
            style={[s.card, { borderTopColor: STATUS_COLOR[table.status] }]}
            onPress={() => handleTablePress(table)}
            activeOpacity={0.8}
          >
            <Text style={s.tableName}>{table.name}</Text>
            <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[table.status] }]} />
            <Text style={[s.statusLabel, { color: STATUS_COLOR[table.status] }]}>
              {STATUS_LABEL[table.status]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderTopWidth: 6,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
    ...SHADOW.md,
  },
  tableName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});