import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithCredentials } = useStore();

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  const handleLogin = () => {
    if (!identifier || !pin) {
      Alert.alert('Erreur', 'Identifiant et PIN requis');
      return;
    }

    const user = loginWithCredentials(identifier, pin);

    if (!user) {
      Alert.alert('Erreur', 'Identifiants incorrects');
      return;
    }

    // 🔥 Redirection selon rôle
    if (user.role === 'manager') {
      router.replace('/(manager)/dashboard');
    } else if (user.role === 'cashier') {
      router.replace('/(cashier)/caisse');
    } else {
      router.replace('/(server)/tables');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>🔐 Connexion</Text>

        <TextInput
          placeholder="Identifiant"
          value={identifier}
          onChangeText={setIdentifier}
          style={s.input}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="PIN"
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
          secureTextEntry
          style={s.input}
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin}>
          <Text style={s.btnText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 30,
    textAlign: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
  },

  btn: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});