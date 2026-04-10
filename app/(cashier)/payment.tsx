// app/(cashier)/payment.tsx

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { Button } from '../../src/components/ui/Button';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, paymentMethodLabel } from '../../src/utils/format';
import { PaymentMethod } from '../../src/types';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Espèces', icon: '💵' },
  { key: 'orange_money', label: 'Orange Money', icon: '🟠' },
  { key: 'mtn_money', label: 'MTN MoMo', icon: '🟡' },
];

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { orders, currentUser, payOrder } = useStore();

  const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountStr, setAmountStr] = useState('');

  if (!order) return null;

  const isPaid = order.status === 'paid';

  const amountReceived = method === 'cash' ? (parseFloat(amountStr) || 0) : order.total;
  const change = amountReceived - order.total;
  const canPay = method !== 'cash' || amountReceived >= order.total;

  const handlePay = () => {
    if (!canPay) {
      Alert.alert('Montant insuffisant', `Il manque ${formatPrice(order.total - amountReceived)}`);
      return;
    }
    Alert.alert('Confirmer le paiement', `${formatPrice(order.total)} — ${paymentMethodLabel(method)}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Valider',
        onPress: () => {
          payOrder(orderId, method, amountReceived, currentUser!.id);
          router.push({ pathname: '/(cashier)/receipt', params: { orderId } });
        },
      },
    ]);
  };

  return (
    <Screen title="Encaissement" back>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Order summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Récapitulatif</Text>
          {order.items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemName} numberOfLines={1}>{item.productNameSnapshot}</Text>
              <Text style={s.itemQty}>×{item.quantity}</Text>
              <Text style={s.itemTotal}>{formatPrice(item.lineTotal)}</Text>
            </View>
          ))}
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        {!isPaid && (
          <>
            {/* Payment method */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Mode de paiement</Text>
              <View style={s.methodRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[s.methodBtn, method === m.key && s.methodBtnActive]}
                    onPress={() => setMethod(m.key)}
                  >
                    <Text style={s.methodIcon}>{m.icon}</Text>
                    <Text style={[s.methodLabel, method === m.key && s.methodLabelActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount received (cash only) */}
            {method === 'cash' && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Montant reçu</Text>
                <TextInput
                  style={s.amountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  value={amountStr}
                  onChangeText={setAmountStr}
                  placeholderTextColor={COLORS.textLight}
                />
                <Text style={s.amountHint}>FCFA</Text>
                {amountReceived >= order.total && (
                  <View style={[s.changeBox, { backgroundColor: change === 0 ? COLORS.success : COLORS.info }]}>
                    <Text style={s.changeLabel}>Monnaie à rendre</Text>
                    <Text style={s.changeAmount}>{formatPrice(change)}</Text>
                  </View>
                )}
                {amountReceived > 0 && amountReceived < order.total && (
                  <View style={[s.changeBox, { backgroundColor: COLORS.danger }]}>
                    <Text style={s.changeLabel}>Manque</Text>
                    <Text style={s.changeAmount}>{formatPrice(order.total - amountReceived)}</Text>
                  </View>
                )}
              </View>
            )}

            {method !== 'cash' && (
              <View style={[s.changeBox, { backgroundColor: COLORS.success }]}>
                <Text style={s.changeLabel}>Montant à encaisser</Text>
                <Text style={s.changeAmount}>{formatPrice(order.total)}</Text>
              </View>
            )}

            <Button label="✅ Valider le paiement" onPress={handlePay} size="lg" variant="success" />
          </>
        )}

        {isPaid && (
          <View style={[s.section, { backgroundColor: COLORS.success + '15', borderColor: COLORS.success, borderWidth: 1 }]}>
            <Text style={[s.sectionTitle, { color: COLORS.success }]}>✅ Commande payée</Text>
            <Text style={s.paidMethod}>{paymentMethodLabel(order.payment!.method)}</Text>
            <Text style={s.paidAmount}>{formatPrice(order.payment!.amountReceived)} reçu</Text>
            {order.payment!.changeGiven > 0 && (
              <Text style={s.paidChange}>Monnaie rendue: {formatPrice(order.payment!.changeGiven)}</Text>
            )}
            <Button
              label="Voir le reçu"
              onPress={() => router.push({ pathname: '/(cashier)/receipt', params: { orderId } })}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { flex: 1, fontSize: 14, color: COLORS.text },
  itemQty: { fontSize: 13, color: COLORS.textLight, minWidth: 28, textAlign: 'center' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: COLORS.text, minWidth: 90, textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textLight },
  totalAmount: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  methodBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  methodIcon: { fontSize: 22 },
  methodLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, textAlign: 'center' },
  methodLabelActive: { color: COLORS.primary },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: 8,
    textAlign: 'center',
  },
  amountHint: { textAlign: 'center', color: COLORS.textLight, fontSize: 14 },
  changeBox: {
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  changeLabel: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.9 },
  changeAmount: { color: '#fff', fontSize: 28, fontWeight: '800' },
  paidMethod: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  paidAmount: { fontSize: 15, color: COLORS.textLight },
  paidChange: { fontSize: 15, color: COLORS.textLight },
});
