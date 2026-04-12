import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';

export default function ShiftsScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🧾 Shifts de caisse</Text>
        <Text style={s.subtitle}>
          Cet écran sera branché dans une prochaine vague.
        </Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>Version actuelle</Text>
          <Text style={s.cardText}>
            Pour stabiliser le MVP, la priorité est donnée au flow :
            service → demande de paiement → validation caisse.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Plus tard</Text>
          <Text style={s.cardText}>
            On ajoutera ici l’ouverture de shift, la fermeture, les écarts,
            et le récapitulatif de caisse.
          </Text>
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
    gap: 16,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 8,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});