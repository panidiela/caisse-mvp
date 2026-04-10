// app/(manager)/pro.tsx
//
// Écran Paywall — affiché quand le manager tente d'accéder à une feature Pro
// sans avoir activé le plan Pro.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';

const PRO_FEATURES = [
  { icon: '✨', title: 'Rapport IA complet', sub: 'Analyse journalière, hebdo et mensuelle par intelligence artificielle' },
  { icon: '📊', title: 'Entrées & Sorties détaillées', sub: 'Vue financière structurée avec solde estimé automatique' },
  { icon: '💡', title: 'Conseils & Alertes personnalisés', sub: 'Recommandations concrètes pour améliorer vos ventes' },
  { icon: '📈', title: 'Tendances & top produits', sub: 'Identifiez ce qui rapporte le plus sur votre établissement' },
  { icon: '🔔', title: 'Alertes de gestion', sub: 'Soyez averti des anomalies ou baisses inhabituelles' },
  { icon: '🔒', title: 'Fonctionnalités futures', sub: 'Accès prioritaire à toutes les nouvelles features Pro' },
];

export default function ProScreen() {
  const router = useRouter();
  const activatePro = useStore((s) => s.activatePro);
  const isPro = useStore((s) => s.isPro);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleActivate = () => {
    if (!code.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const success = activatePro(code);
      setLoading(false);
      if (success) {
        Alert.alert(
          '🎉 Yewo Pro activé !',
          'Votre établissement est maintenant sur le plan Pro. Profitez de toutes les fonctionnalités.',
          [{ text: 'Découvrir', onPress: () => router.replace('/(manager)/rapport') }]
        );
      } else {
        Alert.alert('Code invalide', 'Ce code d\'activation n\'est pas reconnu. Vérifiez et réessayez.');
      }
    }, 800);
  };

  return (
    <Screen title="Yewo Pro" back>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>PRO</Text>
            </View>
            <Text style={s.heroTitle}>Maîtrisez vraiment{'\n'}votre business</Text>
            <Text style={s.heroSub}>
              Avec Yewo Pro, l'intelligence artificielle analyse votre activité et vous guide pour prendre les bonnes décisions.
            </Text>
          </View>

          {/* Features */}
          <View style={s.featuresWrap}>
            <Text style={s.featuresTitle}>Ce que vous débloquez</Text>
            {PRO_FEATURES.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <View style={s.featureIcon}>
                  <Text style={s.featureIconText}>{f.icon}</Text>
                </View>
                <View style={s.featureText}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={s.pricingCard}>
            <View style={s.pricingBadge}>
              <Text style={s.pricingBadgeText}>Offre de lancement</Text>
            </View>
            <Text style={s.pricingAmount}>5 000 FCFA</Text>
            <Text style={s.pricingPer}>par mois · par établissement</Text>
            <View style={s.pricingDivider} />
            <Text style={s.pricingNote}>
              Paiement par Orange Money ou MTN MoMo.{'\n'}
              Contactez-nous pour obtenir votre code d'activation.
            </Text>
          </View>

          {/* Contact */}
          <View style={s.contactCard}>
            <Text style={s.contactTitle}>📞 Contactez-nous</Text>
            <Text style={s.contactText}>WhatsApp : +237 6XX XXX XXX</Text>
            <Text style={s.contactText}>Email : pro@yewo.app</Text>
          </View>

          {/* Activation code */}
          <View style={s.activationWrap}>
            {!showCodeInput ? (
              <TouchableOpacity
                style={s.codeToggleBtn}
                onPress={() => setShowCodeInput(true)}
                activeOpacity={0.8}
              >
                <Text style={s.codeToggleText}>🔑 J'ai déjà un code d'activation</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.codeCard}>
                <Text style={s.codeTitle}>Code d'activation</Text>
                <TextInput
                  style={s.codeInput}
                  placeholder="Ex: YEWO-PRO-2026"
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholderTextColor={COLORS.textLight}
                />
                <TouchableOpacity
                  style={[s.activateBtn, (!code.trim() || loading) && { opacity: 0.5 }]}
                  onPress={handleActivate}
                  disabled={!code.trim() || loading}
                  activeOpacity={0.85}
                >
                  <Text style={s.activateBtnText}>
                    {loading ? 'Vérification...' : 'Activer Yewo Pro'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCodeInput(false)}>
                  <Text style={s.cancelCode}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: COLORS.primary,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    paddingBottom: 36,
  },
  heroBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  heroBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 2 },
  heroTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    textAlign: 'center', lineHeight: 34,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 14,
    textAlign: 'center', lineHeight: 22,
  },

  featuresWrap: { padding: 20, gap: 16 },
  featuresTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textLight,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  featureIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  featureIconText: { fontSize: 20 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  featureSub: { fontSize: 13, color: COLORS.textLight, lineHeight: 18 },

  pricingCard: {
    margin: 20,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOW.md,
  },
  pricingBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 4,
  },
  pricingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  pricingAmount: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  pricingPer: { fontSize: 13, color: COLORS.textLight },
  pricingDivider: { height: 1, width: '80%', backgroundColor: COLORS.border, marginVertical: 8 },
  pricingNote: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', lineHeight: 20 },

  contactCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  contactText: { fontSize: 14, color: COLORS.textLight },

  activationWrap: { margin: 20 },
  codeToggleBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  codeToggleText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  codeCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 20,
    gap: 12,
    ...SHADOW.sm,
  },
  codeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  codeInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  activateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
  },
  activateBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelCode: { color: COLORS.textLight, textAlign: 'center', fontSize: 13, paddingVertical: 4 },
});
