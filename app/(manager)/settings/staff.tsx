import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from "../../../src/store/useStore";

export default function StaffScreen() {
  const { users, addStaff, removeStaff } = useStore();

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'server' | 'cashier'>('server');

  const handleAdd = () => {
    if (!name || !identifier || !pin) {
      Alert.alert('Erreur', 'Nom, identifiant et PIN obligatoires');
      return;
    }

    const result = addStaff({
      name,
      identifier,
      pin,
      role,
    });

    if (!result.ok) {
      Alert.alert('Erreur', result.error);
      return;
    }

    setName('');
    setIdentifier('');
    setPin('');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>👥 Personnel</Text>

        {/* Liste employés */}
        {users.map((u) => (
          <View key={u.id} style={s.user}>
            <View>
              <Text style={s.name}>{u.name}</Text>
              <Text style={s.role}>
                {u.role} • {u.identifier}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                Alert.alert('Supprimer ?', u.name, [
                  { text: 'Annuler' },
                  { text: 'Supprimer', onPress: () => removeStaff(u.id) },
                ])
              }
            >
              <Text style={{ color: 'red' }}>❌</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Ajout */}
        <View style={s.form}>
          <Text style={s.subtitle}>Ajouter un employé</Text>

          <TextInput
            placeholder="Nom"
            value={name}
            onChangeText={setName}
            style={s.input}
          />

          <TextInput
            placeholder="Identifiant (ex: paul)"
            value={identifier}
            onChangeText={setIdentifier}
            style={s.input}
          />

          <TextInput
            placeholder="PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            style={s.input}
          />

          <View style={s.roles}>
            <TouchableOpacity onPress={() => setRole('server')}>
              <Text style={role === 'server' ? s.active : s.inactive}>
                🍽️ Serveur
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setRole('cashier')}>
              <Text style={role === 'cashier' ? s.active : s.inactive}>
                💰 Caissier
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleAdd}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              Ajouter
            </Text>
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
    paddingTop: 10,
    paddingBottom: 30,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },

  user: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 10,
  },

  name: {
    fontWeight: '700',
  },

  role: {
    color: '#666',
  },

  form: {
    marginTop: 20,
  },

  subtitle: {
    fontWeight: '700',
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  roles: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },

  active: {
    fontWeight: '800',
    color: 'green',
  },

  inactive: {
    color: '#999',
  },

  btn: {
    backgroundColor: 'green',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});