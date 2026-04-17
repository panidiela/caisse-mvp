import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { useStore } from '../src/store/useStore';

type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

type AppUser = {
  id: string;
  name?: string;
  username?: string;
  identifier?: string;
  pin?: string;
  role: AppRole;
  isActive?: boolean;
};

function getHomeRouteForRole(role?: AppRole | null): string {
  switch (role) {
    case 'server':
      return '/(server)/tables';
    case 'cashier':
      return '/(cashier)/caisse';
    case 'stockist':
      return '/(manager)/stock';
    case 'manager':
    case 'admin':
      return '/(manager)/dashboard';
    default:
      return '/login';
  }
}

function getRoleLabel(role: AppUser['role']) {
  switch (role) {
    case 'server':
      return 'Serveuse / Serveur';
    case 'cashier':
      return 'Caissière';
    case 'manager':
      return 'Manager';
    case 'admin':
      return 'Administrateur';
    case 'stockist':
      return 'Stockiste';
    default:
      return role;
  }
}

function getUserLabel(user: AppUser) {
  return user.name || user.username || user.identifier || 'Utilisateur';
}

export default function LoginScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const users = useStore((s) => (s.users ?? []) as AppUser[]);
  const login = useStore((s) => s.login);

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pin, setPin] = useState('');

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive !== false),
    [users]
  );

  const redirectTo = !isSetupComplete
    ? '/setup'
    : currentUser
    ? getHomeRouteForRole(currentUser.role as AppRole)
    : null;

  if (redirectTo) {
    return <Redirect href={redirectTo as any} />;
  }

  const goToRoleHome = (user: AppUser) => {
    router.replace(getHomeRouteForRole(user.role) as any);
  };

  const handleConfirmLogin = () => {
    if (!selectedUser) {
      Alert.alert('Profil requis', 'Choisis d’abord un profil.');
      return;
    }

    const expectedPin = String(selectedUser.pin ?? '1234').trim();
    const enteredPin = pin.trim();

    if (!enteredPin) {
      Alert.alert('Code requis', 'Entre le code PIN pour continuer.');
      return;
    }

    if (enteredPin !== expectedPin) {
      Alert.alert('Code incorrect', 'Le code PIN saisi est incorrect.');
      return;
    }

    login(selectedUser);
    setPin('');
    goToRoleHome(selectedUser);
  };

  const handleSelectUser = (user: AppUser) => {
    setSelectedUser(user);
    setPin('');
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setPin('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>Yewo</Text>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Choisis ton profil, puis entre ton code PIN.
        </Text>

        {!selectedUser ? (
          <>
            {activeUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Aucun utilisateur actif</Text>
                <Text style={styles.emptyText}>
                  Le setup n’a probablement pas encore créé les utilisateurs.
                </Text>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => router.replace('/setup')}
                >
                  <Text style={styles.secondaryButtonText}>Aller au setup</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={activeUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.userCard}
                    onPress={() => handleSelectUser(item)}
                  >
                    <View style={styles.userTopRow}>
                      <Text style={styles.userName}>{getUserLabel(item)}</Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                          {getRoleLabel(item.role)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.userHint}>
                      Touchez pour sélectionner ce profil
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </>
        ) : (
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>{getUserLabel(selectedUser)}</Text>
            <Text style={styles.pinRole}>
              {getRoleLabel(selectedUser.role)}
            </Text>

            <Text style={styles.pinLabel}>Code PIN</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder="Entrez votre code"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
            />

            <Pressable style={styles.primaryButton} onPress={handleConfirmLogin}>
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButtonLight}
              onPress={handleBackToList}
            >
              <Text style={styles.secondaryButtonLightText}>
                Choisir un autre profil
              </Text>
            </Pressable>

            <Text style={styles.demoHint}>
              Pour le setup de démo actuel, le code est 1234.
            </Text>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
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
  listContent: {
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginRight: 12,
  },
  roleBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3730a3',
  },
  userHint: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  pinCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  pinRole: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
  },
  pinLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonLight: {
    marginTop: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonLightText: {
    color: '#3730a3',
    fontSize: 15,
    fontWeight: '700',
  },
  demoHint: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: '#6b7280',
  },
  emptyCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
  },
});