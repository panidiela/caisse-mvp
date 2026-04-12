import React, { useMemo, useState } from 'react';
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
  Switch,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../src/constants/theme';
import { ServiceMode } from '../src/types';

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

const SERVICE_MODE_OPTIONS: {
  key: ServiceMode;
  label: string;
  description: string;
}[] = [
  {
    key: 'free',
    label: 'Service libre',
    description: 'Tous les serveurs peuvent servir partout',
  },
  {
    key: 'by_zone',
    label: 'Service par zone',
    description: 'Les serveurs peuvent être affectés à des zones',
  },
  {
    key: 'by_table',
    label: 'Service par table',
    description: 'Service plus structuré par tables / secteurs',
  },
];

export default function EntryScreen() {
  const {
    currentUser,
    isSetupComplete,
    setupEstablishment,
    loginWithCredentials,
  } = useStore();

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);

  // Étape 1 — configuration du lieu
  const [establishmentName, setEstablishmentName] = useState('');
  const [city, setCity] = useState('');

  const [hasCounter, setHasCounter] = useState(true);
  const [usesZones, setUsesZones] = useState(false);
  const [usesTables, setUsesTables] = useState(false);
  const [usesNumberedTables, setUsesNumberedTables] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('free');

  const [zones, setZones] = useState<SetupZoneDraft[]>([
    { name: 'Salle', tableCount: '6' },
  ]);

  // Étape 2 — manager
  const [managerName, setManagerName] = useState('');
  const [managerIdentifier, setManagerIdentifier] = useState('');
  const [managerPin, setManagerPin] = useState('');

  // Étape 3 — employés
  const [employees, setEmployees] = useState<SetupEmployeeDraft[]>([
    { name: '', identifier: '', pin: '', role: 'cashier' },
    { name: '', identifier: '', pin: '', role: 'server' },
  ]);

  const effectiveServiceMode = useMemo<ServiceMode>(() => {
    if (!usesZones && serviceMode === 'by_zone') return 'free';
    if (!usesTables && serviceMode === 'by_table') return 'free';
    return serviceMode;
  }, [usesZones, usesTables, serviceMode]);

  const canGoStep2 = useMemo(() => {
    if (!establishmentName.trim()) return false;

    if (!usesZones && !usesTables) {
      return true;
    }

    if (usesZones) {
      if (zones.length === 0) return false;

      return zones.every((z) => {
        if (!z.name.trim()) return false;
        if (!usesTables) return true;
        return Number.isInteger(Number(z.tableCount)) && Number(z.tableCount) >= 0;
      });
    }

    if (usesTables && !usesZones) {
      if (zones.length === 0) return false;

      return zones.every((z) => {
        return Number.isInteger(Number(z.tableCount)) && Number(z.tableCount) >= 0;
      });
    }

    return true;
  }, [establishmentName, usesZones, usesTables, zones]);

  const canGoStep3 = useMemo(() => {
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
    setZones((prev) => [...prev, { name: '', tableCount: usesTables ? '1' : '0' }]);
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmployee = (index: number, patch: Partial<SetupEmployeeDraft>) => {
    setEmployees((prev) =>
      prev.map((emp, i) => (i === index ? { ...emp, ...patch } : emp))
    );
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
    if (!identifier.trim() || !pin.trim()) {
      Alert.alert('Connexion', 'Veuillez entrer votre identifiant et votre PIN.');
      return;
    }

    const user = loginWithCredentials(identifier.trim().toLowerCase(), pin.trim());

    if (!user) {
      Alert.alert('Connexion refusée', 'Identifiant ou PIN incorrect.');
      return;
    }
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

    let normalizedZones: { name: string; tableCount: number }[] = [];

    if (usesZones) {
      normalizedZones = zones
        .filter((z) => z.name.trim().length > 0)
        .map((z) => ({
          name: z.name.trim(),
          tableCount: usesTables ? Number(z.tableCount) || 0 : 0,
        }));

      if (normalizedZones.length === 0) {
        Alert.alert('Configuration', 'Ajoute au moins une zone.');
        return;
      }
    } else if (usesTables) {
      const totalTableCount = Number(zones[0]?.tableCount || 0);

      if (!Number.isInteger(totalTableCount) || totalTableCount < 0) {
        Alert.alert('Configuration', 'Le nombre de tables est invalide.');
        return;
      }

      normalizedZones = [
        {
          name: 'Tables',
          tableCount: totalTableCount,
        },
      ];
    }

    setupEstablishment({
      establishmentName: establishmentName.trim(),
      city: city.trim() || null,
      configuration: {
        hasCounter,
        usesZones,
        usesTables,
        usesNumberedTables: usesTables ? usesNumberedTables : false,
        serviceMode: effectiveServiceMode,
      },
      manager: {
        name: managerName.trim(),
        identifier: managerIdentifier.trim().toLowerCase(),
        pin: managerPin.trim(),
        role: 'manager',
      },
      employees: cleanedEmployees,
      zones: normalizedZones,
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
                  <Text style={s.title}>Étape 1 · Structure du lieu</Text>
                  <Text style={s.description}>
                    Définis comment ton établissement fonctionne réellement sur le terrain.
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

                  <View style={s.switchCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.switchTitle}>Vente au comptoir</Text>
                      <Text style={s.switchDescription}>
                        Active les ventes directes au comptoir.
                      </Text>
                    </View>
                    <Switch value={hasCounter} onValueChange={setHasCounter} />
                  </View>

                  <View style={s.switchCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.switchTitle}>Utilise des zones</Text>
                      <Text style={s.switchDescription}>
                        Exemples : terrasse, piscine, étage, salle.
                      </Text>
                    </View>
                    <Switch
                      value={usesZones}
                      onValueChange={(value) => {
                        setUsesZones(value);
                        if (!value && serviceMode === 'by_zone') {
                          setServiceMode('free');
                        }
                      }}
                    />
                  </View>

                  <View style={s.switchCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.switchTitle}>Utilise des tables</Text>
                      <Text style={s.switchDescription}>
                        Active les ventes associées à des tables.
                      </Text>
                    </View>
                    <Switch
                      value={usesTables}
                      onValueChange={(value) => {
                        setUsesTables(value);
                        if (!value) {
                          setUsesNumberedTables(false);
                          if (serviceMode === 'by_table') {
                            setServiceMode('free');
                          }
                        }
                      }}
                    />
                  </View>

                  {usesTables && (
                    <View style={s.switchCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.switchTitle}>Tables numérotées</Text>
                        <Text style={s.switchDescription}>
                          Active si tes tables ont des numéros réels.
                        </Text>
                      </View>
                      <Switch
                        value={usesNumberedTables}
                        onValueChange={setUsesNumberedTables}
                      />
                    </View>
                  )}

                  <Text style={s.sectionTitle}>Organisation du service</Text>

                  <View style={s.modeList}>
                    {SERVICE_MODE_OPTIONS.map((option) => {
                      const disabled =
                        (option.key === 'by_zone' && !usesZones) ||
                        (option.key === 'by_table' && !usesTables);

                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            s.modeCard,
                            effectiveServiceMode === option.key && s.modeCardActive,
                            disabled && s.modeCardDisabled,
                          ]}
                          onPress={() => {
                            if (!disabled) setServiceMode(option.key);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              s.modeTitle,
                              effectiveServiceMode === option.key && s.modeTitleActive,
                              disabled && s.modeTitleDisabled,
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              s.modeDescription,
                              effectiveServiceMode === option.key && s.modeDescriptionActive,
                              disabled && s.modeDescriptionDisabled,
                            ]}
                          >
                            {option.description}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {usesZones && (
                    <>
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
                              placeholder="Ex: Terrasse, Piscine, Salle"
                              placeholderTextColor={COLORS.textLight}
                            />
                          </View>

                          {usesTables && (
                            <View style={s.fieldWrap}>
                              <Text style={s.label}>Nombre de tables</Text>
                              <TextInput
                                style={s.input}
                                value={zone.tableCount}
                                onChangeText={(text) =>
                                  updateZone(index, { tableCount: text })
                                }
                                placeholder="Ex: 6"
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="number-pad"
                              />
                            </View>
                          )}
                        </View>
                      ))}

                      <TouchableOpacity style={s.secondaryBtn} onPress={addZone}>
                        <Text style={s.secondaryBtnText}>+ Ajouter une zone</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {!usesZones && usesTables && (
                    <>
                      <Text style={s.sectionTitle}>Tables</Text>

                      <View style={s.block}>
                        <View style={s.fieldWrap}>
                          <Text style={s.label}>Nombre total de tables</Text>
                          <TextInput
                            style={s.input}
                            value={zones[0]?.tableCount || ''}
                            onChangeText={(text) => {
                              if (zones.length === 0) {
                                setZones([{ name: 'Tables', tableCount: text }]);
                              } else {
                                updateZone(0, { tableCount: text, name: 'Tables' });
                              }
                            }}
                            placeholder="Ex: 10"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </>
                  )}

                  <TouchableOpacity
                    style={[s.primaryBtn, !canGoStep2 && s.primaryBtnDisabled]}
                    onPress={() => {
                      if (!canGoStep2) {
                        Alert.alert(
                          'Configuration',
                          'Veuillez compléter correctement la structure du lieu.'
                        );
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
                  <Text style={s.title}>Étape 2 · Manager</Text>
                  <Text style={s.description}>
                    Crée maintenant le compte du manager principal.
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
                    <TouchableOpacity
                      style={s.secondaryHalfBtn}
                      onPress={() => setSetupStep(1)}
                    >
                      <Text style={s.secondaryBtnText}>Retour</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.primaryHalfBtn, !canGoStep3 && s.primaryBtnDisabled]}
                      onPress={() => {
                        if (!canGoStep3) {
                          Alert.alert(
                            'Configuration',
                            'Veuillez compléter correctement le compte manager.'
                          );
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
                  <Text style={s.title}>Étape 3 · Employés</Text>
                  <Text style={s.description}>
                    Ajoute les serveurs/serveuses et caissier(e)s.
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
                          placeholder="Ex: Nadège"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>

                      <View style={s.fieldWrap}>
                        <Text style={s.label}>Identifiant</Text>
                        <TextInput
                          style={s.input}
                          value={emp.identifier}
                          onChangeText={(text) =>
                            updateEmployee(index, { identifier: text })
                          }
                          placeholder="Ex: nadege"
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
                          <Text
                            style={[
                              s.roleBtnText,
                              emp.role === 'server' && s.roleBtnTextActive,
                            ]}
                          >
                            Serveur/Serveuse
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.roleBtn, emp.role === 'cashier' && s.roleBtnActive]}
                          onPress={() => updateEmployee(index, { role: 'cashier' })}
                        >
                          <Text
                            style={[
                              s.roleBtnText,
                              emp.role === 'cashier' && s.roleBtnTextActive,
                            ]}
                          >
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
                    <TouchableOpacity
                      style={s.secondaryHalfBtn}
                      onPress={() => setSetupStep(2)}
                    >
                      <Text style={s.secondaryBtnText}>Retour</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.primaryHalfBtn}
                      onPress={handleFinishSetup}
                    >
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

          <Text style={s.version}>MVP v4.0 · Mode hors-ligne</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  modeList: {
    gap: 10,
  },
  modeCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '12',
  },
  modeCardDisabled: {
    opacity: 0.45,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  modeTitleActive: {
    color: COLORS.primary,
  },
  modeTitleDisabled: {
    color: COLORS.textLight,
  },
  modeDescription: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  modeDescriptionActive: {
    color: COLORS.primary,
  },
  modeDescriptionDisabled: {
    color: COLORS.textLight,
  },
  switchCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  switchDescription: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  version: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    paddingTop: 16,
  },
});