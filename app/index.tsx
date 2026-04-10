import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../src/constants/theme';

type SetupEmployeeDraft = {
  name: string;
  identifier: string;
  pin: string;
  role: 'server' | 'cashier';
};

type SetupZoneDraft = {
  name: string;
  tableCount: string;
};

export default function EntryScreen() {
  const { isSetupComplete, currentUser, setupEstablishment, loginWithCredentials } = useStore();

  const [identifier, setIdentifier] = React.useState('');
  const [pin, setPin] = React.useState('');

  const [setupStep, setSetupStep] = React.useState<1 | 2 | 3>(1);

  const [establishmentName, setEstablishmentName] = React.useState('');
  const [city, setCity] = React.useState('');
  const [zones, setZones] = React.useState<SetupZoneDraft[]>([
    { name: '', tableCount: '6' },
  ]);

  const [managerName, setManagerName] = React.useState('');
  const [managerIdentifier, setManagerIdentifier] = React.useState('');
  const [managerPin, setManagerPin] = React.useState('');

  const [employees, setEmployees] = React.useState<SetupEmployeeDraft[]>([
    { name: '', identifier: '', pin: '', role: 'cashier' },
    { name: '', identifier: '', pin: '', role: 'server' },
  ]);

  const canGoStep2 = React.useMemo(() => {
    if (!establishmentName.trim()) return false;
    if (zones.length === 0) return false;

    return zones.every(
      (z) => z.name.trim().length > 0 && Number(z.tableCount) > 0
    );
  }, [establishmentName, zones]);

  const canGoStep3 = React.useMemo(() => {
    return (
      managerName.trim().length > 0 &&
      managerIdentifier.trim().length > 0 &&
      managerPin.trim().length >= 4
    );
  }, [managerName, managerIdentifier, managerPin]);

  const updateZone = (index: number, patch: Partial<SetupZoneDraft>) => {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  };

  const addZone = () => {
    setZones((prev) => [...prev, { name: '', tableCount: '1' }]);
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmployee = (index: number, patch: Partial<SetupEmployeeDraft>) => {
    setEmployees((prev) => prev.map((emp, i) => (i === index ? { ...emp, ...patch } : emp)));
  };

  const addEmployee = () => {
    setEmployees((prev) => [
      ...prev,
      { name: '', identifier: '', pin: '', role: 'server' },
    ]);
  };

  const removeEmployee = (index: number) => {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLogin = () => {
    const user = loginWithCredentials(identifier.trim().toLowerCase(), pin.trim());

    if (!user) {
      Alert.alert('Connexion refusée', 'Identifiant ou PIN incorrect.');
      return;
    }

    setPin('');
  };

  const handleFinishSetup = () => {
    const cleanedEmployees = employees
      .filter(
        (e) =>
          e.name.trim() &&
          e.identifier.trim() &&
          e.pin.trim() &&
          e.pin.trim().length >= 4
      )
      .map((e) => ({
        name: e.name.trim(),
        identifier: e.identifier.trim().toLowerCase(),
        pin: e.pin.trim(),
        role: e.role,
      }));

    const identifiers = [
      managerIdentifier.trim().toLowerCase(),
      ...cleanedEmployees.map((e) => e.identifier),
    ];

    if (new Set(identifiers).size !== identifiers.length) {
      Alert.alert('Configuration', 'Chaque identifiant doit être unique.');
      return;
    }

    const tables = zones.flatMap((zone) => {
      const count = Number(zone.tableCount);
      return Array.from({ length: count }).map((_, i) => ({
        name: `${zone.name.trim()} ${i + 1}`,
      }));
    });

    if (tables.length === 0) {
      Alert.alert('Configuration', 'Ajoutez au moins une table.');
      return;
    }

    setupEstablishment({
      establishmentName: establishmentName.trim(),
      city: city.trim() || null,
      manager: {
        name: managerName.trim(),
        identifier: managerIdentifier.trim().toLowerCase(),
        pin: managerPin.trim(),
        role: 'manager',
      },
      employees: cleanedEmployees,
      tables,
    });

    Alert.alert(
      'Configuration terminée',
      'Votre établissement est prêt. Vous pouvez maintenant vous connecter.',
      [
        {
          text: 'OK',
          onPress: () => {
            setIdentifier(managerIdentifier.trim().toLowerCase());
            setPin('');
          },
        },
      ]
    );
  };

  if (!isSetupComplete) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={s.scrollContent}>
            <View style={s.header}>
              <Text style={s.logo}>🟢</Text>
              <Text style={s.appName}>Yewo</Text>
              <Text style={s.subtitle}>Configuration initiale</Text>
            </View>

            <View style={s.stepsRow}>
              <View style={[s.stepBubble, setupStep === 1 && s.stepBubbleActive]}>
                <Text style={[s.stepBubbleText, setupStep === 1 && s.stepBubbleTextActive]}>1</Text>
              </View>
              <View style={s.stepLine} />
              <View style={[s.stepBubble, setupStep === 2 && s.stepBubbleActive]}>
                <Text style={[s.stepBubbleText, setupStep === 2 && s.stepBubbleTextActive]}>2</Text>
              </View>
              <View style={s.stepLine} />
              <View style={[s.stepBubble, setupStep === 3 && s.stepBubbleActive]}>
                <Text style={[s.stepBubbleText, setupStep === 3 && s.stepBubbleTextActive]}>3</Text>
              </View>
            </View>

            <View style={s.card}>
              {setupStep === 1 && (
                <>
                  <Text style={s.title}>Étape 1 • Établissement</Text>
                  <Text style={s.description}>
                    Renseignez le nom du lieu, la ville et vos zones avec le nombre de tables.
                  </Text>

                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Nom de l’établissement</Text>
                    <TextInput
                      style={s.input}
                      value={establishmentName}
                      onChangeText={setEstablishmentName}
                      placeholder="Ex: Drink Ming and Dining"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>

                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Ville (optionnel)</Text>
                    <TextInput
                      style={s.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="Ex: Yaoundé"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>

                  <Text style={s.sectionTitle}>Zones</Text>

                  {zones.map((zone, index) => (
                    <View key={index} style={s.block}>
                      <View style={s.blockHeader}>
                        <Text style={s.blockTitle}>Zone {index + 1}</Text>
                        {zones.length > 1 && (
                          <TouchableOpacity onPress={() => removeZone(index)}>
                            <Text style={s.removeText}>Supprimer</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>Nom de la zone</Text>
                        <TextInput
                          style={s.input}
                          value={zone.name}
                          onChangeText={(text) => updateZone(index, { name: text })}
                          placeholder="Ex: Salle, Terrasse, VIP, Comptoir"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>Nombre de tables</Text>
                        <TextInput
                          style={s.input}
                          value={zone.tableCount}
                          onChangeText={(text) => updateZone(index, { tableCount: text })}
                          placeholder="Ex: 6"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={s.secondaryBtn} onPress={addZone}>
                    <Text style={s.secondaryBtnText}>+ Ajouter une zone</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.primaryBtn, !canGoStep2 && s.primaryBtnDisabled]}
                    onPress={() => {
                      if (!canGoStep2) {
                        Alert.alert('Configuration', 'Veuillez compléter correctement l’établissement et les zones.');
                        return;
                      }
                      setSetupStep(2);
                    }}
                  >
                    <Text style={s.primaryBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </>
              )}

              {setupStep === 2 && (
                <>
                  <Text style={s.title}>Étape 2 • Administrateur</Text>
                  <Text style={s.description}>
                    Créez maintenant le compte du boss / manager principal.
                  </Text>

                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Nom du manager</Text>
                    <TextInput
                      style={s.input}
                      value={managerName}
                      onChangeText={setManagerName}
                      placeholder="Ex: Thierry"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>

                  <View style={s.fieldWrap}>
                    <Text style={s.label}>Identifiant</Text>
                    <TextInput
                      style={s.input}
                      value={managerIdentifier}
                      onChangeText={setManagerIdentifier}
                      placeholder="Ex: admin"
                      placeholderTextColor={COLORS.textLight}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={s.fieldWrap}>
                    <Text style={s.label}>PIN</Text>
                    <TextInput
                      style={s.input}
                      value={managerPin}
                      onChangeText={setManagerPin}
                      placeholder="Minimum 4 chiffres"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="number-pad"
                      secureTextEntry
                    />
                  </View>

                  <View style={s.footerRow}>
                    <TouchableOpacity style={s.secondaryHalfBtn} onPress={() => setSetupStep(1)}>
                      <Text style={s.secondaryBtnText}>Retour</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.primaryHalfBtn, !canGoStep3 && s.primaryBtnDisabled]}
                      onPress={() => {
                        if (!canGoStep3) {
                          Alert.alert('Configuration', 'Veuillez compléter correctement le compte administrateur.');
                          return;
                        }
                        setSetupStep(3);
                      }}
                    >
                      <Text style={s.primaryBtnText}>Suivant</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {setupStep === 3 && (
                <>
                  <Text style={s.title}>Étape 3 • Employés</Text>
                  <Text style={s.description}>
                    Ajoutez les serveurs/serveuses et caissier(e)s.
                  </Text>

                  {employees.map((emp, index) => (
                    <View key={index} style={s.block}>
                      <View style={s.blockHeader}>
                        <Text style={s.blockTitle}>Employé {index + 1}</Text>
                        <TouchableOpacity onPress={() => removeEmployee(index)}>
                          <Text style={s.removeText}>Supprimer</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>Nom</Text>
                        <TextInput
                          style={s.input}
                          value={emp.name}
                          onChangeText={(text) => updateEmployee(index, { name: text })}
                          placeholder="Ex: Zoé"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>Identifiant</Text>
                        <TextInput
                          style={s.input}
                          value={emp.identifier}
                          onChangeText={(text) => updateEmployee(index, { identifier: text })}
                          placeholder="Ex: zoe"
                          placeholderTextColor={COLORS.textLight}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>PIN</Text>
                        <TextInput
                          style={s.input}
                          value={emp.pin}
                          onChangeText={(text) => updateEmployee(index, { pin: text })}
                          placeholder="Minimum 4 chiffres"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="number-pad"
                          secureTextEntry
                        />
                      </View>

                      <View style={s.roleRow}>
                        <TouchableOpacity
                          style={[s.roleBtn, emp.role === 'server' && s.roleBtnActive]}
                          onPress={() => updateEmployee(index, { role: 'server' })}
                        >
                          <Text style={[s.roleBtnText, emp.role === 'server' && s.roleBtnTextActive]}>
                            Serveur/Serveuse
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.roleBtn, emp.role === 'cashier' && s.roleBtnActive]}
                          onPress={() => updateEmployee(index, { role: 'cashier' })}
                        >
                          <Text style={[s.roleBtnText, emp.role === 'cashier' && s.roleBtnTextActive]}>
                            Caissier(e)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={s.secondaryBtn} onPress={addEmployee}>
                    <Text style={s.secondaryBtnText}>+ Ajouter un employé</Text>
                  </TouchableOpacity>

                  <View style={s.footerRow}>
                    <TouchableOpacity style={s.secondaryHalfBtn} onPress={() => setSetupStep(2)}>
                      <Text style={s.secondaryBtnText}>Retour</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.primaryHalfBtn} onPress={handleFinishSetup}>
                      <Text style={s.primaryBtnText}>Terminer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.container}>
            <View style={s.header}>
              <Text style={s.logo}>🟢</Text>
              <Text style={s.appName}>Yewo</Text>
              <Text style={s.subtitle}>Connexion</Text>
            </View>

            <View style={s.card}>
              <Text style={s.title}>Se connecter</Text>
              <Text style={s.description}>
                Entrez votre identifiant et votre code PIN.
              </Text>

              <View style={s.fieldWrap}>
                <Text style={s.label}>Identifiant</Text>
                <TextInput
                  style={s.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Ex: admin"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.label}>PIN</Text>
                <TextInput
                  style={s.input}
                  value={pin}
                  onChangeText={setPin}
                  placeholder="****"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  secureTextEntry
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity style={s.primaryBtn} onPress={handleLogin}>
                <Text style={s.primaryBtnText}>Se connecter</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.version}>MVP v2.1 • Mode hors-ligne</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (currentUser.role === 'server') {
    return <Redirect href="/(server)/tables" />;
  }

  if (currentUser.role === 'cashier') {
    return <Redirect href="/(cashier)/caisse" />;
  }

  return <Redirect href="/(manager)/dashboard" />;
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 56,
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    marginTop: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  stepBubble: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActive: {
    backgroundColor: '#fff',
  },
  stepBubbleText: {
    color: '#fff',
    fontWeight: '800',
  },
  stepBubbleTextActive: {
    color: COLORS.primary,
  },
  stepLine: {
    width: 26,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 20,
    gap: 14,
    ...SHADOW.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  block: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  removeText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  roleBtnTextActive: {
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryHalfBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryHalfBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    paddingTop: 16,
  },
});