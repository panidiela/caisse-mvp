import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';

export default function LoginScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const loginWithCredentials = useStore((s) => s.loginWithCredentials);

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!isSetupComplete) {
      router.replace('/setup');
    }
  }, [isSetupComplete]);

  if (!isSetupComplete) {
    return <Redirect href="/setup" />;
  }

  if (currentUser?.role === 'server') {
    return <Redirect href="/(server)/tables" />;
  }

  if (currentUser?.role === 'cashier') {
    return <Redirect href="/(cashier)/caisse" />;
  }

  if (
    currentUser?.role === 'manager' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'stockist'
  ) {
    return <Redirect href="/(manager)/dashboard" />;
  }

  const handleLogin = () => {
    if (!identifier.trim() || !pin.trim()) {
      Alert.alert('Connexion', 'Veuillez entrer votre identifiant et votre PIN.');
      return;
    }

    const user = loginWithCredentials(
      identifier.trim().toLowerCase(),
      pin.trim()
    );

    if (!user) {
      Alert.alert('Connexion refusée', 'Identifiant ou PIN incorrect.');
      return;
    }

    if (user.role === 'server') {
      router.replace('/(server)/tables');
      return;
    }

    if (user.role === 'cashier') {
      router.replace('/(cashier)/caisse');
      return;
    }

    router.replace('/(manager)/dashboard');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Yewo</Text>
            <Text style={styles.subtitle}>
              Connectez-vous avec votre identifiant et votre PIN.
            </Text>

            <Text style={styles.label}>Identifiant</Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Ex: patron"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>PIN</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="Votre PIN"
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});