import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, paymentMethodLabel } from '../../src/utils/format';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function ReceiptScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { orders, users, establishment } = useStore();

  const order = useMemo(
    () => orders.find((o) => o.id === orderId),
    [orders, orderId]
  );

  const cashierName = useMemo(() => {
    if (!order?.payment?.validatedByUserId) return '';
    return (
      users.find((u) => u.id === order.payment?.validatedByUserId)?.name ||
      'Caissier'
    );
  }, [users, order]);

  if (!order) return null;

  const buildReceiptHtml = () => {
    const title = establishment?.name || 'Établissement';
    const city = establishment?.city || '';
    const paidAt = order.payment?.paidAt || new Date().toISOString();

    const itemsHtml = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding: 6px 0;">${item.productNameSnapshot}</td>
            <td style="padding: 6px 0; text-align: center;">${item.quantity}</td>
            <td style="padding: 6px 0; text-align: right;">${formatPrice(item.lineTotal)}</td>
          </tr>
        `
      )
      .join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
          <div style="text-align: center; margin-bottom: 18px;">
            <h2 style="margin: 0 0 6px 0;">${title}</h2>
            <p style="margin: 0;">${city}</p>
          </div>

          <div style="margin-bottom: 16px; font-size: 14px;">
            <p style="margin: 0 0 4px 0;"><strong>Référence :</strong> ${order.reference}</p>
            <p style="margin: 0 0 4px 0;"><strong>Date :</strong> ${paidAt}</p>
            <p style="margin: 0 0 4px 0;"><strong>Caissier :</strong> ${cashierName}</p>
            <p style="margin: 0 0 4px 0;"><strong>Type :</strong> ${
              order.tableId ? 'Service / table' : 'Comptoir'
            }</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
            <thead>
              <tr>
                <th style="text-align: left; border-bottom: 1px solid #ccc; padding-bottom: 8px;">Produit</th>
                <th style="text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 8px;">Qté</th>
                <th style="text-align: right; border-bottom: 1px solid #ccc; padding-bottom: 8px;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 1px solid #ccc; padding-top: 12px; font-size: 14px;">
            <p style="margin: 0 0 6px 0;"><strong>Total :</strong> ${formatPrice(order.total)}</p>
            <p style="margin: 0 0 6px 0;"><strong>Mode de paiement :</strong> ${
              order.payment ? paymentMethodLabel(order.payment.method) : 'N/A'
            }</p>
            <p style="margin: 0 0 6px 0;"><strong>Montant reçu :</strong> ${formatPrice(
              order.payment?.amountReceived || 0
            )}</p>
            <p style="margin: 0;"><strong>Monnaie rendue :</strong> ${formatPrice(
              order.payment?.changeGiven || 0
            )}</p>
          </div>

          <p style="margin-top: 26px; text-align: center; font-size: 13px;">
            Merci pour votre visite 🙏
          </p>
        </body>
      </html>
    `;
  };

  const handleSharePdf = async () => {
    try {
      const html = buildReceiptHtml();
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('PDF généré', `Le fichier a été généré ici : ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager ou télécharger le reçu PDF',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le PDF du reçu.');
    }
  };

  const handleBackToCashier = () => {
    router.replace('/(cashier)/caisse');
  };

  const statusLabel =
    order.status === 'paid'
      ? '✅ Paiement validé'
      : order.status === 'money_collected'
      ? '💵 Argent reçu'
      : order.status === 'sent'
      ? '⏳ Envoyée'
      : '📝 Brouillon';

  return (
    <Screen title="Reçu" back>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text style={s.title}>Reçu de paiement</Text>
          <Text style={s.subtitle}>{statusLabel}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations</Text>

          <View style={s.row}>
            <Text style={s.label}>Référence</Text>
            <Text style={s.value}>{order.reference}</Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Contexte</Text>
            <Text style={s.value}>
              {order.tableId ? 'Service / table' : 'Comptoir'}
            </Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Caissier</Text>
            <Text style={s.value}>{cashierName || 'N/A'}</Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Date</Text>
            <Text style={s.value}>
              {order.payment?.paidAt || order.updatedAt}
            </Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Détail</Text>

          {order.items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.productNameSnapshot}</Text>
                <Text style={s.itemMeta}>
                  {formatPrice(item.unitPriceSnapshot)} × {item.quantity}
                </Text>
              </View>

              <Text style={s.itemAmount}>{formatPrice(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Paiement</Text>

          <View style={s.row}>
            <Text style={s.label}>Mode</Text>
            <Text style={s.value}>
              {order.payment ? paymentMethodLabel(order.payment.method) : 'N/A'}
            </Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Montant reçu</Text>
            <Text style={s.value}>
              {formatPrice(order.payment?.amountReceived || 0)}
            </Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Monnaie rendue</Text>
            <Text style={s.value}>
              {formatPrice(order.payment?.changeGiven || 0)}
            </Text>
          </View>

          <View style={[s.row, s.totalRow]}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={handleSharePdf}>
          <Text style={s.primaryBtnText}>📄 Générer / partager le PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={handleBackToCashier}>
          <Text style={s.secondaryBtnText}>Retour à la caisse</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.sm,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  label: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
  },

  value: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'right',
    fontWeight: '600',
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  itemMeta: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },

  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
    minWidth: 90,
  },

  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },

  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  secondaryBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
});