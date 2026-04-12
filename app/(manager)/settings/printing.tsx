import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useStore } from "../../../src/store/useStore";
import { COLORS, RADIUS, SHADOW } from '../../../src/constants/theme';
import { formatPrice } from '../../../src/utils/format';

export default function PrintingScreen() {
  const { establishment, orders, users } = useStore();

  const latestPaidOrder = useMemo(() => {
    return [...orders]
      .filter((o) => o.status === 'paid')
      .sort((a, b) => {
        const aDate = a.payment?.paidAt ?? a.updatedAt;
        const bDate = b.payment?.paidAt ?? b.updatedAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })[0];
  }, [orders]);

  const buildTicketHtml = () => {
    const title = establishment?.name || 'Établissement';
    const city = establishment?.city || '';
    const now = new Date().toLocaleString();

    if (!latestPaidOrder) {
      return `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h2 style="margin-bottom: 8px;">${title}</h2>
            <p style="margin: 0 0 4px 0;">${city}</p>
            <p style="margin: 0 0 20px 0;">${now}</p>
            <hr />
            <p style="margin-top: 20px;">Aucune facture payée disponible pour générer un ticket PDF.</p>
          </body>
        </html>
      `;
    }

    const cashierName =
      users.find((u) => u.id === latestPaidOrder.payment?.validatedByUserId)?.name ||
      'Caissier';

    const itemsHtml = latestPaidOrder.items
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
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="margin: 0 0 6px 0;">${title}</h2>
            <p style="margin: 0;">${city}</p>
          </div>

          <div style="margin-bottom: 18px; font-size: 14px;">
            <p style="margin: 0 0 4px 0;"><strong>Référence :</strong> ${latestPaidOrder.reference}</p>
            <p style="margin: 0 0 4px 0;"><strong>Date :</strong> ${latestPaidOrder.payment?.paidAt || now}</p>
            <p style="margin: 0 0 4px 0;"><strong>Caissier :</strong> ${cashierName}</p>
            <p style="margin: 0 0 4px 0;"><strong>Contexte :</strong> ${
              latestPaidOrder.tableId ? 'Service / table' : 'Vente comptoir'
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
            <p style="margin: 0 0 6px 0;"><strong>Total :</strong> ${formatPrice(latestPaidOrder.total)}</p>
            <p style="margin: 0 0 6px 0;"><strong>Mode de paiement :</strong> ${
              latestPaidOrder.payment?.method || 'N/A'
            }</p>
            <p style="margin: 0 0 6px 0;"><strong>Montant reçu :</strong> ${formatPrice(
              latestPaidOrder.payment?.amountReceived || 0
            )}</p>
            <p style="margin: 0;"><strong>Monnaie rendue :</strong> ${formatPrice(
              latestPaidOrder.payment?.changeGiven || 0
            )}</p>
          </div>

          <p style="margin-top: 28px; text-align: center; font-size: 13px;">
            Merci pour votre visite 🙏
          </p>
        </body>
      </html>
    `;
  };

  const generateAndSharePdf = async () => {
    try {
      const html = buildTicketHtml();
      const { uri } = await Print.printToFileAsync({ html });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'PDF généré',
          `Le PDF a bien été généré.\n\nFichier : ${uri}`
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager ou télécharger le ticket PDF',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🖨️ Impression / PDF</Text>
        <Text style={s.subtitle}>
          Génère un ticket PDF même sans imprimante, puis partage-le ou télécharge-le.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dernière facture payée</Text>

          {latestPaidOrder ? (
            <View style={s.infoCard}>
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Référence : </Text>
                {latestPaidOrder.reference}
              </Text>
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Total : </Text>
                {formatPrice(latestPaidOrder.total)}
              </Text>
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Contexte : </Text>
                {latestPaidOrder.tableId ? 'Service / table' : 'Comptoir'}
              </Text>
            </View>
          ) : (
            <Text style={s.emptyText}>
              Aucune facture payée pour le moment. Le PDF sera généré avec un message vide.
            </Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Actions</Text>

          <TouchableOpacity style={s.primaryBtn} onPress={generateAndSharePdf}>
            <Text style={s.primaryBtnText}>📄 Générer le ticket PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.sm,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  infoCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },

  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },

  infoLabel: {
    fontWeight: '800',
    color: COLORS.text,
  },

  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 20,
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
});