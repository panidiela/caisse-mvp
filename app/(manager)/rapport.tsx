// app/(manager)/rapport.tsx
//
// Écran Rapport IA — appelle Claude en arrière-plan quand le réseau est disponible.
// Structure : Entrées / Sorties / Déductions / Achats stock / Solde estimé + analyse narrative.

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice, paymentMethodLabel } from '../../src/utils/format';
import { Order } from '../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'day' | 'week' | 'month';

interface Section {
  label: string;
  items: { label: string; value: number; sub?: string }[];
}

interface AIReport {
  sections: Section[];
  solde: number;
  soldeSub: string;
  analyse: string;
  alertes: string[];
  conseils: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByPeriod(orders: Order[], period: Period): Order[] {
  const now = new Date();
  return orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (period === 'day') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const ref = new Date(now); ref.setDate(now.getDate() - 7);
      return d >= ref;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function buildBusinessData(orders: Order[], period: Period) {
  const filtered = filterByPeriod(orders, period);
  const paid = filtered.filter((o) => o.status === 'paid');
  const pending = filtered.filter((o) => !['paid', 'cancelled'].includes(o.status));

  const totalRevenue = paid.reduce((s, o) => s + o.total, 0);
  const avgTicket = paid.length ? Math.round(totalRevenue / paid.length) : 0;

  const byMethod: Record<string, number> = {};
  paid.forEach((o) => {
    if (!o.payment) return;
    byMethod[o.payment.method] = (byMethod[o.payment.method] ?? 0) + o.total;
  });

  const productMap: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
  paid.forEach((o) => o.items.forEach((item) => {
    if (!productMap[item.productId]) {
      productMap[item.productId] = { name: item.productNameSnapshot, qty: 0, revenue: 0, category: '' };
    }
    productMap[item.productId].qty += item.quantity;
    productMap[item.productId].revenue += item.lineTotal;
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Revenue by day for trend
  const byDay: Record<string, number> = {};
  paid.forEach((o) => {
    const day = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    byDay[day] = (byDay[day] ?? 0) + o.total;
  });

  const periodLabel = { day: 'Aujourd\'hui', week: 'Cette semaine', month: 'Ce mois' }[period];
  const now = new Date();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return {
    periodLabel, monthLabel, totalRevenue, avgTicket,
    ticketsPaid: paid.length, ticketsPending: pending.length,
    byMethod, topProducts, byDay,
    paid, pending,
  };
}

function buildPrompt(data: ReturnType<typeof buildBusinessData>, period: Period): string {
  const pm = Object.entries(data.byMethod)
    .map(([k, v]) => `${paymentMethodLabel(k)}: ${v} FCFA`).join(', ') || 'aucun';

  const prods = data.topProducts
    .map((p, i) => `${i + 1}. ${p.name} — ${p.qty} vendus — ${p.revenue} FCFA`).join('\n');

  const trend = Object.entries(data.byDay)
    .map(([d, v]) => `${d}: ${v} FCFA`).join(' | ') || 'pas de données';

  return `Tu es un conseiller de gestion expert pour les petits commerces en Afrique centrale (cafés, bars, restaurants, snacks). Tu parles français, tu es direct, concret et bienveillant.

Le manager te demande un rapport complet pour la période : ${data.periodLabel} (${data.monthLabel}).

=== DONNÉES BRUTES DE L'APPLICATION ===

RECETTES (commandes payées) :
- Recettes totales : ${data.totalRevenue} FCFA
- Tickets payés : ${data.ticketsPaid}
- Ticket moyen : ${data.avgTicket} FCFA
- Commandes encore ouvertes : ${data.ticketsPending}

Par mode de paiement :
${pm}

Produits vendus (par chiffre d'affaires) :
${prods || 'aucune donnée'}

Évolution journalière :
${trend}

=== INSTRUCTIONS ===

Génère un rapport JSON structuré EXACTEMENT selon ce format (réponds UNIQUEMENT avec le JSON, sans backticks, sans texte avant ou après) :

{
  "sections": [
    {
      "label": "ENTRÉES",
      "items": [
        { "label": "Total recettes", "value": 7888150, "sub": "Somme des ventes payées" },
        { "label": "Espèces", "value": 4000000, "sub": "Paiements en cash" },
        { "label": "Orange Money", "value": 2000000, "sub": "Paiements OM" },
        { "label": "MTN MoMo", "value": 1888150, "sub": "Paiements MTN" }
      ]
    },
    {
      "label": "PERFORMANCE",
      "items": [
        { "label": "Ticket moyen", "value": 1250, "sub": "Par commande payée" },
        { "label": "Commandes payées", "value": 42, "sub": null },
        { "label": "Commandes en attente", "value": 3, "sub": "Non encore encaissées" }
      ]
    },
    {
      "label": "PRODUITS PHARES",
      "items": [
        { "label": "Castel Bière", "value": 350000, "sub": "45 vendus" },
        { "label": "Poulet braisé", "value": 280000, "sub": "14 vendus" }
      ]
    }
  ],
  "solde": 321900,
  "soldeSub": "Recettes nettes estimées après déductions typiques",
  "analyse": "Paragraphe d'analyse narrative ici. Commente la performance, les tendances, les forces et faiblesses. Sois précis et utile. 4-6 phrases.",
  "alertes": [
    "Alerte ou point d'attention court (ex: commandes non encaissées)",
    "Alerte 2 si pertinent"
  ],
  "conseils": [
    "Conseil actionnable court (ex: relancer les ventes de plats le soir)",
    "Conseil 2",
    "Conseil 3"
  ]
}

RÈGLES :
- Utilise UNIQUEMENT les données fournies ci-dessus, ne génère pas de données fictives sauf pour les sections que les données ne couvrent pas (dans ce cas mets 0 et indique "données non disponibles").
- Les values sont toujours des nombres (pas de strings).
- L'analyse doit être en français, personnalisée, pas générique.
- Maximum 3 alertes, maximum 4 conseils.
- Réponds UNIQUEMENT avec le JSON valide.`;
}

// ─── Composants de rendu ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: number; sub?: string | null; accent?: boolean }) {
  return (
    <View style={[kpi.card, accent && kpi.cardAccent]}>
      <Text style={[kpi.label, accent && kpi.labelAccent]}>{label}</Text>
      <Text style={[kpi.value, accent && kpi.valueAccent]}>{formatPrice(value)}</Text>
      {sub ? <Text style={[kpi.sub, accent && kpi.subAccent]}>{sub}</Text> : null}
    </View>
  );
}

const kpi = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, gap: 4, ...SHADOW.sm, minWidth: '47%',
  },
  cardAccent: { backgroundColor: COLORS.primary },
  label: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  labelAccent: { color: 'rgba(255,255,255,0.75)' },
  value: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  valueAccent: { color: '#fff', fontSize: 20 },
  sub: { fontSize: 11, color: COLORS.textLight },
  subAccent: { color: 'rgba(255,255,255,0.6)' },
});

function SectionBlock({ section }: { section: Section }) {
  const isPerf = section.label === 'PERFORMANCE';
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{section.label}</Text>
      <View style={sec.grid}>
        {section.items.map((item, i) => {
          const isCount = isPerf && (item.label.toLowerCase().includes('commande') || item.label.toLowerCase().includes('ticket'));
          return (
            <View key={i} style={[sec.card, i === 0 && section.label === 'ENTRÉES' && sec.cardFull]}>
              <Text style={sec.itemLabel}>{item.label}</Text>
              <Text style={[sec.itemValue, isCount && sec.itemValueCount]}>
                {isCount ? item.value : formatPrice(item.value)}
              </Text>
              {item.sub ? <Text style={sec.itemSub}>{item.sub}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: { gap: 10 },
  title: {
    fontSize: 11, fontWeight: '700', color: COLORS.textLight,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, gap: 3, ...SHADOW.sm,
    width: '47%',
  },
  cardFull: { width: '100%' },
  itemLabel: { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },
  itemValue: { fontSize: 20, fontWeight: '800', color: '#C0392B' },
  itemValueCount: { color: COLORS.primary },
  itemSub: { fontSize: 11, color: COLORS.textLight, marginTop: 1 },
});

function SoldeCard({ solde, sub }: { solde: number; sub: string }) {
  return (
    <View style={sol.card}>
      <View style={sol.left}>
        <Text style={sol.label}>Solde estimé</Text>
        <Text style={sol.sub}>{sub}</Text>
      </View>
      <Text style={sol.amount}>{formatPrice(solde)}</Text>
    </View>
  );
}

const sol = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', ...SHADOW.md,
    borderLeftWidth: 5, borderLeftColor: COLORS.primary,
  },
  left: { flex: 1, gap: 3 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 12, color: COLORS.textLight },
  amount: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
});

function AnalyseBlock({ text }: { text: string }) {
  return (
    <View style={ana.card}>
      <Text style={ana.title}>📊 Analyse</Text>
      <Text style={ana.text}>{text}</Text>
    </View>
  );
}

const ana = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 18, gap: 10, ...SHADOW.sm },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
});

function AlertesBlock({ alertes, conseils }: { alertes: string[]; conseils: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      {alertes.length > 0 && (
        <View style={al.card}>
          <Text style={al.title}>⚠️ Points d'attention</Text>
          {alertes.map((a, i) => (
            <View key={i} style={al.row}>
              <Text style={al.dot}>•</Text>
              <Text style={al.text}>{a}</Text>
            </View>
          ))}
        </View>
      )}
      {conseils.length > 0 && (
        <View style={[al.card, { borderLeftColor: COLORS.success }]}>
          <Text style={[al.title, { color: COLORS.success }]}>💡 Conseils</Text>
          {conseils.map((c, i) => (
            <View key={i} style={al.row}>
              <Text style={[al.dot, { color: COLORS.success }]}>→</Text>
              <Text style={al.text}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const al = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16,
    gap: 8, ...SHADOW.sm, borderLeftWidth: 4, borderLeftColor: COLORS.warning,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#B7791F', marginBottom: 2 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { fontSize: 14, color: '#B7791F', marginTop: 2 },
  text: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Aujourd\'hui' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
];

export default function RapportScreen() {
  const router = useRouter();
  const { orders, currentUser } = useStore();
  const [period, setPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const data = useMemo(() => buildBusinessData(orders, period), [orders, period]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const prompt = buildPrompt(data, period);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', // modèle rapide et économique
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message ?? `Erreur ${response.status}`);
      }

      const result = await response.json();
      const raw = result.content?.map((b: any) => b.text ?? '').join('') ?? '';

      // Nettoyer et parser le JSON
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed: AIReport = JSON.parse(cleaned);
      setReport(parsed);
      setLastGenerated(new Date());
    } catch (e: any) {
      if (e.message?.includes('Network') || e.message?.includes('fetch')) {
        setError('Pas de connexion internet. Connectez-vous pour générer le rapport IA.');
      } else {
        setError(`Erreur : ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [data, period]);

  // Quand on change de période, reset le rapport
  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setReport(null);
    setError(null);
  };

  const genTime = lastGenerated
    ? lastGenerated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Screen title="Rapport IA" back>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={generateReport} />}
      >

        {/* En-tête période */}
        <View style={s.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[s.periodBtn, period === p.key && s.periodBtnActive]}
              onPress={() => handlePeriodChange(p.key)}
            >
              <Text style={[s.periodLabel, period === p.key && s.periodLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Résumé chiffres bruts (toujours visible, offline) */}
        <View style={s.rawCard}>
          <Text style={s.rawTitle}>📦 Données locales — {data.periodLabel}</Text>
          <View style={s.rawRow}>
            <View style={s.rawItem}>
              <Text style={s.rawLabel}>Recettes</Text>
              <Text style={[s.rawValue, { color: '#27AE60' }]}>{formatPrice(data.totalRevenue)}</Text>
            </View>
            <View style={s.rawItem}>
              <Text style={s.rawLabel}>Tickets payés</Text>
              <Text style={[s.rawValue, { color: COLORS.primary }]}>{data.ticketsPaid}</Text>
            </View>
            <View style={s.rawItem}>
              <Text style={s.rawLabel}>Ticket moyen</Text>
              <Text style={[s.rawValue, { color: COLORS.text }]}>{formatPrice(data.avgTicket)}</Text>
            </View>
          </View>
          {Object.keys(data.byMethod).length > 0 && (
            <View style={s.methodsRow}>
              {Object.entries(data.byMethod).map(([m, v]) => (
                <View key={m} style={s.methodChip}>
                  <Text style={s.methodChipLabel}>{paymentMethodLabel(m)}</Text>
                  <Text style={s.methodChipValue}>{formatPrice(v)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bouton générer */}
        {!loading && (
          <TouchableOpacity style={s.generateBtn} onPress={generateReport} activeOpacity={0.85}>
            <Text style={s.generateIcon}>✨</Text>
            <View style={s.generateTextWrap}>
              <Text style={s.generateLabel}>Générer le rapport IA</Text>
              <Text style={s.generateSub}>
                {genTime ? `Dernier rapport : ${genTime}` : 'Analyse complète avec conseils'}
              </Text>
            </View>
            <Text style={s.generateArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>L'IA analyse votre activité...</Text>
            <Text style={s.loadingSub}>Cela prend quelques secondes</Text>
          </View>
        )}

        {/* Erreur */}
        {error && !loading && (
          <View style={s.errorCard}>
            <Text style={s.errorIcon}>📡</Text>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={generateReport}>
              <Text style={s.retryLabel}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rapport IA structuré */}
        {report && !loading && (
          <>
            {/* Sections (Entrées, Performance, Produits phares...) */}
            {report.sections.map((section, i) => (
              <SectionBlock key={i} section={section} />
            ))}

            {/* Solde final */}
            <SoldeCard solde={report.solde} sub={report.soldeSub} />

            {/* Analyse narrative */}
            <AnalyseBlock text={report.analyse} />

            {/* Alertes + conseils */}
            <AlertesBlock alertes={report.alertes} conseils={report.conseils} />

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerText}>
                Rapport généré le {lastGenerated?.toLocaleDateString('fr-FR')} à {genTime}
              </Text>
              <Text style={s.footerSub}>Propulsé par IA · Yewo — Maîtrisez votre business</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
    ...SHADOW.sm,
  },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  periodLabelActive: { color: '#fff' },

  rawCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, gap: 14, ...SHADOW.sm,
  },
  rawTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textLight },
  rawRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rawItem: { alignItems: 'center', gap: 4 },
  rawLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  rawValue: { fontSize: 17, fontWeight: '800' },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.xl,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  methodChipLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  methodChipValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  generateBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOW.md,
  },
  generateIcon: { fontSize: 28 },
  generateTextWrap: { flex: 1 },
  generateLabel: { color: '#fff', fontSize: 16, fontWeight: '800' },
  generateSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  generateArrow: { color: 'rgba(255,255,255,0.6)', fontSize: 28 },

  loadingCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 40, alignItems: 'center', gap: 12, ...SHADOW.sm,
  },
  loadingText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  loadingSub: { fontSize: 13, color: COLORS.textLight },

  errorCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 24, alignItems: 'center', gap: 12, ...SHADOW.sm,
    borderWidth: 1, borderColor: COLORS.danger + '30',
  },
  errorIcon: { fontSize: 36 },
  errorText: { fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  retryLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },

  footer: { alignItems: 'center', gap: 4, paddingTop: 8 },
  footerText: { fontSize: 12, color: COLORS.textLight },
  footerSub: { fontSize: 11, color: COLORS.textLight, opacity: 0.6 },
});
