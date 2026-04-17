import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function SetupScreen() {
  const users = useStore((s) => s.users ?? []);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const setupEstablishment = useStore((s) => s.setupEstablishment);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUsers = useMemo(() => Array.isArray(users) && users.length > 0, [users]);

  const handleCreateDemoSetup = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      setupEstablishment({
        establishmentName: 'Yewo Démo',
        city: 'Yaoundé',
        configuration: {
          hasCounter: true,
          usesZones: true,
          usesTables: true,
          usesNumberedTables: true,
          serviceMode: 'by_table',
        },
        manager: {
          name: 'Manager Démo',
          identifier: 'manager',
          pin: '1234',
          role: 'manager',
        },
        employees: [
          {
            name: 'Caissière Démo',
            identifier: 'caisse',
            pin: '1234',
            role: 'cashier',
          },
          {
            name: 'Serveuse Démo',
            identifier: 'serveuse',
            pin: '1234',
            role: 'server',
          },
          {
            name: 'Stockiste Démo',
            identifier: 'stock',
            pin: '1234',
            role: 'stockist',
          },
        ],
        zones: [
          { name: 'Salle A', tableCount: 6 },
          { name: 'Terrasse', tableCount: 4 },
        ],
      });

      Alert.alert(
        'Setup terminé',
        'Les utilisateurs de démonstration ont été créés. Tu peux maintenant te connecter.'
      );

      router.replace('/login');
    } catch (error) {
      console.error('Setup failed', error);
      Alert.alert(
        'Erreur',
        "Le setup automatique a échoué. Regarde la console si besoin."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>Yewo</Text>
        <Text style={styles.title}>Configuration initiale</Text>
        <Text style={styles.subtitle}>
          On crée maintenant un environnement de test simple pour sortir de la
          boucle setup/login et continuer proprement la stabilisation.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>État actuel</Text>

          <Text style={styles.cardText}>
            Setup complété : {isSetupComplete ? 'Oui' : 'Non'}
          </Text>

          <Text style={styles.cardText}>
            Utilisateurs présents : {hasUsers ? users.length : 0}
          </Text>

          <Text style={styles.note}>
            Comptes qui seront créés :
          </Text>
          <Text style={styles.credentials}>• manager / 1234</Text>
          <Text style={styles.credentials}>• caisse / 1234</Text>
          <Text style={styles.credentials}>• serveuse / 1234</Text>
          <Text style={styles.credentials}>• stock / 1234</Text>

          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleCreateDemoSetup}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Création en cours...' : 'Créer le setup de démo'}
            </Text>
          </Pressable>

          {hasUsers && (
            <Pressable style={styles.secondaryButton} onPress={handleGoToLogin}>
              <Text style={styles.secondaryButtonText}>Aller au login</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
  },
  card: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
  },
  note: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  credentials: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3730a3',
    fontSize: 15,
    fontWeight: '700',
  },
});