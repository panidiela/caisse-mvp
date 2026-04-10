import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, paymentMethodLabel } from '../../src/utils/format';
import { canAccessManager } from '../../src/utils/access';

export default function DashboardScreen() {
  const router = useRouter();
  const { orders, currentUser, isPro } = useStore();
  const pro = isPro();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }

    if (!canAccessManager(currentUser)) {
      Alert.alert('Accès refusé', 'Cet écran est réservé au manager.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [currentUser]);

  const today = new Date().toDateString();

  const todayOrders = useMemo(
    () => orders.filter((o) => new Date(o.createdAt).toDateString() === today),
    [orders]
  );

  const paidToday = todayOrders.filter((o) => o.status === 'paid');
  const pendingToday = todayOrders.filter((o) => o.status !== 'paid' && o.status !== 'cancelled');
  const totalRevenue = paidToday.reduce((sum, o) => sum + o.total, 0);

  const byMethod = paidToday.reduce<Record<string, number>>((acc, o) => {
    if (!o.payment) return acc;
    acc[o.payment.method] = (acc[o.payment.method] ?? 0) + o.total;
    return acc;
  }, {});

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    paidToday.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productNameSnapshot,
            qty: 0,
            revenue: 0,
          };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.lineTotal;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [paidToday]);

  if (!currentUser || !canAccessManager(currentUser)) return null;

  const handleLogout = () => {
    useStore.getState().logout();
    router.replace('/');
  };

  const handleRapportPress = () => {
    if (pro) router.push('/(manager)/rapport');
    else router.push('/(manager)/pro');
  };

  const handleSettingsPress = () => {
    router.push('/(manager)/settings');
  };

  return (
    <Screen
      title={`Dashboard · ${currentUser.name}`}
      rightAction={{ label: 'Déco', onPress: handleLogout }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <TouchableOpacity
          style={s.settingsBtn}
          onPress={handleSettingsPress}
          activeOpacity={0.85}
        >
          <View>
            <Text style={s.settingsTitle}>⚙️ Réglages</Text>
            <Text style={s.settingsSub}>
              Personnel, tables, zones et établissement
            </Text>
          </View>
          <Text style={s.settingsArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.aiBtn, !pro && s.aiBtnLocked]}
          onPress={handleRapportPress}
          activeOpacity={0.85}
        >
          <View style={s.aiBtnLeft}>
            <Text style={s.aiIcon}>{pro ? '✨' : '🔒'}</Text>
            <View>
              <View style={s.aiTitleRow}>
                <Text style={s.aiLabel}>Rapport IA</Text>
                {!pro && (
                  <View style={s.proBadge}>
                    <Text style={s.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={s.aiSub}>
                {pro
                  ? 'Analyse · Conseils · Alertes — par période'
                  : 'Passez en Pro pour accéder à l’analyse IA'}
              </Text>
            </View>
          </View>
          <Text style={s.aiArrow}>›</Text>
        </TouchableOpacity>

        <View style={s.kpiRow}>
          <View style={[s.kpi, { backgroundColor: COLORS.primary }]}>
            <Text style={s.kpiLabel}>Ventes du jour</Text>
            <Text style={s.kpiValue}>{formatPrice(totalRevenue)}</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={s.kpiLabel}>Tickets payés</Text>
            <Text style={s.kpiValue}>{paidToday.length}</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          <View style={[s.kpi, { backgroundColor: COLORS.occupied }]}>
            <Text style={s.kpiLabel}>En cours</Text>
            <Text style={s.kpiValue}>{pendingToday.length}</Text>
          </View>
          <View style={[s.kpi, { backgroundColor: COLORS.info }]}>
            <Text style={s.kpiLabel}>Total tickets</Text>
            <Text style={s.kpiValue}>{todayOrders.length}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Ventes par mode de paiement</Text>
          {Object.keys(byMethod).length === 0 && (
            <Text style={s.empty}>Aucune vente aujourd'hui</Text>
          )}
          {Object.entries(byMethod).map(([method, amount]) => (
            <View key={method} style={s.methodRow}>
              <Text style={s.methodLabel}>{paymentMethodLabel(method)}</Text>
              <Text style={s.methodAmount}>{formatPrice(amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Produits les plus vendus</Text>
          {topProducts.length === 0 && (
            <Text style={s.empty}>Aucune vente aujourd'hui</Text>
          )}
          {topProducts.map((p, i) => (
            <View key={p.name} style={s.productRow}>
              <Text style={s.rank}>#{i + 1}</Text>
              <Text style={s.productName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={s.productStats}>
                <Text style={s.productQty}>{p.qty} vendu(s)</Text>
                <Text style={s.productRevenue}>{formatPrice(p.revenue)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  settingsBtn: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  settingsSub: {
    color: COLORS.textLight,
    fontSize: 13,
    marginTop: 2,
  },
  settingsArrow: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '800',
  },

  aiBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.md,
  },
  aiBtnLocked: { opacity: 0.95 },
  aiBtnLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  aiIcon: { fontSize: 24 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
  aiSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  aiArrow: { color: '#fff', fontSize: 26, fontWeight: '800' },
  proBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  kpiRow: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, padding: 16, borderRadius: RADIUS.lg, ...SHADOW.md },
  kpiLabel: { color: '#fff', fontSize: 13, fontWeight: '700', opacity: 0.9 },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  empty: { color: COLORS.textLight, fontSize: 14 },

  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  methodAmount: { color: COLORS.primary, fontWeight: '800' },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontWeight: '800', color: COLORS.primary },
  productName: { flex: 1, color: COLORS.text, fontWeight: '700' },
  productStats: { alignItems: 'flex-end' },
  productQty: { fontSize: 12, color: COLORS.textLight },
  productRevenue: { fontWeight: '800', color: COLORS.primary },
});