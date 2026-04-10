import React, { useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { Button } from '../../src/components/ui/Button';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice } from '../../src/utils/format';
import { OrderItem } from '../../src/types';
import { canAccessServer } from '../../src/utils/access';

export default function OrderScreen() {
  const { orderId, tableId } = useLocalSearchParams<{ orderId: string; tableId: string }>();
  const router = useRouter();
  const { orders, tables, updateItemQuantity, setOrderStatus, currentUser } = useStore();

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

  const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);
  const table = useMemo(() => tables.find((t) => t.id === tableId), [tables, tableId]);

  if (!currentUser || !canAccessServer(currentUser) || !order) return null;

  const isPaid = order.status === 'paid';
  const isWaiting = order.status === 'waiting_payment';

  const handleAddProducts = () => {
    router.push({ pathname: '/(server)/products', params: { orderId } });
  };

  const handleScanBarcode = () => {
    router.push({ pathname: '/(server)/scan', params: { orderId } });
  };

  const handleRequestBill = () => {
    Alert.alert('Demander l\'addition', 'La table sera marquée "En attente de paiement".', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: () => {
          setOrderStatus(orderId, 'waiting_payment');
          router.back();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: OrderItem }) => (
    <View style={s.item}>
      <View style={s.itemInfo}>
        <Text style={s.itemName} numberOfLines={1}>{item.productNameSnapshot}</Text>
        <Text style={s.itemPrice}>{formatPrice(item.unitPriceSnapshot)} × {item.quantity}</Text>
      </View>
      <Text style={s.itemTotal}>{formatPrice(item.lineTotal)}</Text>
      {!isPaid && !isWaiting && (
        <View style={s.qtyControls}>
          <TouchableOpacity style={s.qtyBtn} onPress={() => updateItemQuantity(orderId, item.id, item.quantity - 1)}>
            <Text style={s.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.qty}>{item.quantity}</Text>
          <TouchableOpacity style={s.qtyBtn} onPress={() => updateItemQuantity(orderId, item.id, item.quantity + 1)}>
            <Text style={s.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Screen title={table?.name ?? 'Commande'} back>
      <FlatList
        data={order.items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucun article</Text>
            <Text style={s.emptySubtext}>Ajoutez des produits à la commande</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
      />
      <View style={s.footer}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
        </View>
        {!isPaid && !isWaiting && (
          <View style={s.actions}>
            <Button label="📷 Scanner" onPress={handleScanBarcode} variant="outline" style={s.actionBtn} />
            <Button label="+ Produits" onPress={handleAddProducts} variant="primary" style={s.actionBtn} />
          </View>
        )}
        {!isPaid && !isWaiting && order.items.length > 0 && (
          <Button label="Demander l'addition" onPress={handleRequestBill} variant="secondary" style={{ marginTop: 8 }} />
        )}
        {isWaiting && (
          <View style={s.waitingBadge}>
            <Text style={s.waitingText}>⏳ En attente de paiement</Text>
          </View>
        )}
        {isPaid && (
          <View style={[s.waitingBadge, { backgroundColor: COLORS.success }]}>
            <Text style={s.waitingText}>✅ Payée</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  item: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
    ...SHADOW.sm,
  },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemPrice: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  itemTotal: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  qty: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 6 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalAmount: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
  waitingBadge: { backgroundColor: COLORS.warning, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  waitingText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});