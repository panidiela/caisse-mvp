// app/(cashier)/receipt.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, formatDate, paymentMethodLabel } from '../../src/utils/format';

export default function ReceiptScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { orders, tables } = useStore();

  const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);
  const table = useMemo(() => tables.find((t) => t.id === order?.tableId), [tables, order]);

  if (!order) return null;

  return (
    <Screen title="Reçu" back>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={s.receipt}>
          {/* Header */}
          <Text style={s.shopName}>Yewo</Text>
          <Text style={s.shopSub}>Maîtrisez votre business</Text>
          <View style={s.divider} />

          <View style={s.metaRow}>
            <Text style={s.meta}>Table: {table?.name ?? 'Comptoir'}</Text>
            <Text style={s.meta}>N° {order.id.slice(-6).toUpperCase()}</Text>
          </View>
          <Text style={s.meta}>{formatDate(order.payment?.paidAt ?? order.createdAt)}</Text>
          <View style={s.divider} />

          {/* Items */}
          {order.items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemName} numberOfLines={2}>{item.productNameSnapshot}</Text>
              <View style={s.itemRight}>
                <Text style={s.itemQtyPrice}>{item.quantity} × {formatPrice(item.unitPriceSnapshot)}</Text>
                <Text style={s.itemTotal}>{formatPrice(item.lineTotal)}</Text>
              </View>
            </View>
          ))}

          <View style={s.dividerDashed} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
          </View>

          {order.payment && (
            <>
              <View style={s.divider} />
              <View style={s.payRow}>
                <Text style={s.payLabel}>Mode</Text>
                <Text style={s.payValue}>{paymentMethodLabel(order.payment.method)}</Text>
              </View>
              {order.payment.method === 'cash' && (
                <>
                  <View style={s.payRow}>
                    <Text style={s.payLabel}>Reçu</Text>
                    <Text style={s.payValue}>{formatPrice(order.payment.amountReceived)}</Text>
                  </View>
                  <View style={s.payRow}>
                    <Text style={s.payLabel}>Monnaie</Text>
                    <Text style={[s.payValue, { color: COLORS.primary, fontWeight: '800' }]}>
                      {formatPrice(order.payment.changeGiven)}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}

          <View style={s.divider} />
          <Text style={s.thanks}>Merci pour votre visite ! 🙏</Text>
        </View>

        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace('/(cashier)/caisse')}
        >
          <Text style={s.backBtnText}>← Retour à la caisse</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  receipt: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 24,
    gap: 10,
    ...SHADOW.md,
  },
  shopName: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: COLORS.text },
  shopSub: { fontSize: 13, textAlign: 'center', color: COLORS.textLight },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  dividerDashed: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 13, color: COLORS.textLight },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemName: { flex: 1, fontSize: 14, color: COLORS.text },
  itemRight: { alignItems: 'flex-end' },
  itemQtyPrice: { fontSize: 12, color: COLORS.textLight },
  itemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalAmount: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payLabel: { fontSize: 14, color: COLORS.textLight },
  payValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  thanks: { textAlign: 'center', fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  backBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
