import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from "../../../src/store/useStore";
import { COLORS, RADIUS, SHADOW } from '../../../src/constants/theme';
import { formatPrice } from '../../../src/utils/format';

export default function ShiftsScreen() {
  const { shifts, users } = useStore();

  const sortedShifts = useMemo(() => {
    return [...shifts].sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
    );
  }, [shifts]);

  const getCashierName = (cashierUserId: string) => {
    return users.find((u) => u.id === cashierUserId)?.name || 'Caissier';
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🧾 Shifts de caisse</Text>
        <Text style={s.subtitle}>
          Consulte les sessions de caisse ouvertes et fermées, avec les écarts automatiques.
        </Text>

        {sortedShifts.length === 0 ? (
          <View style={s.section}>
            <Text style={s.emptyText}>Aucun shift enregistré pour le moment.</Text>
          </View>
        ) : (
          sortedShifts.map((shift) => (
            <View key={shift.id} style={s.section}>
              <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>{getCashierName(shift.cashierUserId)}</Text>
                  <Text style={s.metaText}>Ouvert : {shift.openedAt}</Text>
                  <Text style={s.metaText}>
                    Fermé : {shift.closedAt || 'Encore ouvert'}
                  </Text>
                </View>

                <View
                  style={[
                    s.badge,
                    shift.status === 'open' ? s.badgeOpen : s.badgeClosed,
                  ]}
                >
                  <Text style={s.badgeText}>
                    {shift.status === 'open' ? 'OUVERT' : 'FERMÉ'}
                  </Text>
                </View>
              </View>

              <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Ventes</Text>
                  <Text style={s.summaryValue}>{shift.salesCount}</Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Total encaissé</Text>
                  <Text style={s.summaryValue}>{formatPrice(shift.totalPaidAmount)}</Text>
                </View>
              </View>

              <Text style={s.blockTitle}>Stock initial</Text>
              {shift.initialStock.length === 0 ? (
                <Text style={s.smallEmpty}>Aucun stock initial saisi.</Text>
              ) : (
                shift.initialStock.map((line) => (
                  <View key={`initial-${shift.id}-${line.productId}`} style={s.lineRow}>
                    <Text style={s.lineLabel}>{line.productNameSnapshot}</Text>
                    <Text style={s.lineValue}>{line.quantity}</Text>
                  </View>
                ))
              )}

              <Text style={s.blockTitle}>Stock final</Text>
              {shift.finalStock.length === 0 ? (
                <Text style={s.smallEmpty}>Pas encore fermé.</Text>
              ) : (
                shift.finalStock.map((line) => (
                  <View key={`final-${shift.id}-${line.productId}`} style={s.lineRow}>
                    <Text style={s.lineLabel}>{line.productNameSnapshot}</Text>
                    <Text style={s.lineValue}>{line.quantity}</Text>
                  </View>
                ))
              )}

              <Text style={s.blockTitle}>Écarts</Text>
              {shift.differenceLines.length === 0 ? (
                <Text style={s.smallEmpty}>Aucun écart calculé pour l’instant.</Text>
              ) : (
                shift.differenceLines.map((line) => (
                  <View key={`diff-${shift.id}-${line.productId}`} style={s.diffCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.diffName}>{line.productNameSnapshot}</Text>
                      <Text style={s.diffMeta}>
                        Théorique: {line.theoreticalQuantity} • Réel: {line.actualQuantity}
                      </Text>
                    </View>

                    <Text
                      style={[
                        s.diffValue,
                        line.difference === 0
                          ? s.diffZero
                          : line.difference > 0
                          ? s.diffPositive
                          : s.diffNegative,
                      ]}
                    >
                      {line.difference > 0 ? `+${line.difference}` : line.difference}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))
        )}
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

  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },

  metaText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  badgeOpen: {
    backgroundColor: COLORS.warning,
  },

  badgeClosed: {
    backgroundColor: COLORS.success,
  },

  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  summaryBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },

  smallEmpty: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  lineLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },

  lineValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  diffCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },

  diffName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  diffMeta: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textLight,
  },

  diffValue: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'right',
  },

  diffZero: {
    color: COLORS.success,
  },

  diffPositive: {
    color: COLORS.primary,
  },

  diffNegative: {
    color: COLORS.danger,
  },
});