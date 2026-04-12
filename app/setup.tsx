import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
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
    description: 'Tous les serveurs peuvent servir partout.',
  },
  {
    key: 'by_zone',
    label: 'Service par zone',
    description: 'Les serveurs peuvent être affectés à des zones.',
  },
  {
    key: 'by_table',
    label: 'Service par table',
    description: 'Service plus structuré par tables.',
  },
];

export default function SetupScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const isSetupComplete = useStore((s) => s.isSetupComplete);
  const setupEstablishment = useStore((s) => s.setupEstablishment);

  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);

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

  const [managerName, setManagerName] = useState('');
  const [managerIdentifier, setManagerIdentifier] = useState('');
  const [managerPin, setManagerPin] = useState('');

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

        const parsed = Number(z.tableCount);
        return Number.isInteger(parsed) && parsed >= 0;
      });
    }

    if (usesTables && !usesZones) {
      if (zones.length === 0) return false;

      return zones.every((z) => {
        const parsed = Number(z.tableCount);
        return Number.isInteger(parsed) && parsed >= 0;
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

  if (isSetupComplete && currentUser?.role === 'server') {
    return <Redirect href="/(server)/tables" />;
  }

  if (isSetupComplete && currentUser?.role === 'cashier') {
    return <Redirect href="/(cashier)/caisse" />;
  }

  if (
    isSetupComplete &&
    (currentUser?.role === 'manager' ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'stockist')
  ) {
    return <Redirect href="/(manager)/dashboard" />;
  }

  if (isSetupComplete) {
    return <Redirect href="/login" />;
  }

  const updateZone = (index: number, patch: Partial<SetupZoneDraft>) => {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  };

  const addZone = () => {
    setZones((prev) => [...prev, { name: '', tableCount: usesTables ? '1' : '0' }]);
  };

  const removeZone = (index: number) => {
    setZones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEmployee = (
    index: number,
    patch: Partial<SetupEmployeeDraft>
  ) => {
    setEmployees((prev) =>
      prev.map((employee, i) =>
        i === index ? { ...employee, ...patch } : employee
      )
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

  const handleFinishSetup = () => {
    const cleanedEmployees = employees
      .filter(
        (employee) =>
          employee.name.trim() &&
          employee.identifier.trim() &&
          employee.pin.trim() &&
          employee.pin.trim().length >= 4
      )
      .map((employee) => ({
        name: employee.name.trim(),
        identifier: employee.identifier.trim().toLowerCase(),
        pin: employee.pin.trim(),
        role: employee.role,
      }));

    const identifiers = [
      managerIdentifier.trim().toLowerCase(),
      ...cleanedEmployees.map((employee) => employee.identifier),
    ];

    if (new Set(identifiers).size !== identifiers.length) {
      Alert.alert('Configuration', 'Chaque identifiant doit être unique.');
      return;
    }

    let normalizedZones: { name: string; tableCount: number }[] = [];

    if (usesZones) {
      normalizedZones = zones
        .filter((zone) => zone.name.trim().length > 0)
        .map((zone) => ({
          name: zone.name.trim(),
          tableCount: usesTables ? Number(zone.tableCount) || 0 : 0,
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
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Yewo</Text>
            <Text style={styles.subtitle}>Configuration initiale</Text>

            <View style={styles.stepRow}>
              <StepBadge value="1" active={setupStep === 1} />
              <StepBadge value="2" active={setupStep === 2} />
              <StepBadge value="3" active={setupStep === 3} />
            </View>

            {setupStep === 1 && (
              <>
                <SectionTitle title="Étape 1 · Structure du lieu" />
                <SectionText text="Définis comment ton établissement fonctionne réellement sur le terrain." />

                <Label text="Nom de l’établissement" />
                <TextInput
                  value={establishmentName}
                  onChangeText={setEstablishmentName}
                  placeholder="Ex: Yewo Café"
                  style={styles.input}
                />

                <Label text="Ville (optionnel)" />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ex: Yaoundé"
                  style={styles.input}
                />

                <SwitchRow
                  label="Vente au comptoir"
                  description="Active les ventes directes au comptoir."
                  value={hasCounter}
                  onValueChange={setHasCounter}
                />

                <SwitchRow
                  label="Utilise des zones"
                  description="Exemples : terrasse, piscine, étage, salle."
                  value={usesZones}
                  onValueChange={(value) => {
                    setUsesZones(value);
                    if (!value && serviceMode === 'by_zone') {
                      setServiceMode('free');
                    }
                  }}
                />

                <SwitchRow
                  label="Utilise des tables"
                  description="Active les ventes associées à des tables."
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

                {usesTables && (
                  <SwitchRow
                    label="Tables numérotées"
                    description="Active si tes tables ont des numéros réels."
                    value={usesNumberedTables}
                    onValueChange={setUsesNumberedTables}
                  />
                )}

                <Label text="Organisation du service" />

                {SERVICE_MODE_OPTIONS.map((option) => {
                  const disabled =
                    (option.key === 'by_zone' && !usesZones) ||
                    (option.key === 'by_table' && !usesTables);

                  const isActive = effectiveServiceMode === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionCard,
                        isActive && styles.optionCardActive,
                        disabled && styles.optionCardDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (!disabled) {
                          setServiceMode(option.key);
                        }
                      }}
                    >
                      <Text style={styles.optionTitle}>{option.label}</Text>
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {usesZones && (
                  <>
                    <Label text="Zones" />

                    {zones.map((zone, index) => (
                      <View key={index} style={styles.block}>
                        <View style={styles.blockHeader}>
                          <Text style={styles.blockTitle}>Zone {index + 1}</Text>
                          {zones.length > 1 && (
                            <TouchableOpacity onPress={() => removeZone(index)}>
                              <Text style={styles.linkDanger}>Supprimer</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <TextInput
                          value={zone.name}
                          onChangeText={(text) => updateZone(index, { name: text })}
                          placeholder="Ex: Terrasse, Piscine, Salle"
                          style={styles.input}
                        />

                        {usesTables && (
                          <TextInput
                            value={zone.tableCount}
                            onChangeText={(text) =>
                              updateZone(index, { tableCount: text })
                            }
                            placeholder="Nombre de tables"
                            keyboardType="number-pad"
                            style={styles.input}
                          />
                        )}
                      </View>
                    ))}

                    <TouchableOpacity style={styles.secondaryButton} onPress={addZone}>
                      <Text style={styles.secondaryButtonText}>+ Ajouter une zone</Text>
                    </TouchableOpacity>
                  </>
                )}

                {!usesZones && usesTables && (
                  <>
                    <Label text="Tables" />
                    <TextInput
                      value={zones[0]?.tableCount ?? '0'}
                      onChangeText={(text) => {
                        if (zones.length === 0) {
                          setZones([{ name: 'Tables', tableCount: text }]);
                        } else {
                          updateZone(0, { tableCount: text, name: 'Tables' });
                        }
                      }}
                      placeholder="Nombre total de tables"
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={styles.primaryButton}
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
                  <Text style={styles.primaryButtonText}>Suivant</Text>
                </TouchableOpacity>
              </>
            )}

            {setupStep === 2 && (
              <>
                <SectionTitle title="Étape 2 · Manager" />
                <SectionText text="Crée maintenant le compte du manager principal." />

                <Label text="Nom du manager" />
                <TextInput
                  value={managerName}
                  onChangeText={setManagerName}
                  placeholder="Ex: Patron"
                  style={styles.input}
                />

                <Label text="Identifiant" />
                <TextInput
                  value={managerIdentifier}
                  onChangeText={setManagerIdentifier}
                  placeholder="Ex: patron"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />

                <Label text="PIN" />
                <TextInput
                  value={managerPin}
                  onChangeText={setManagerPin}
                  placeholder="Minimum 4 chiffres"
                  keyboardType="number-pad"
                  secureTextEntry
                  style={styles.input}
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryActionButton}
                    onPress={() => setSetupStep(1)}
                  >
                    <Text style={styles.secondaryActionButtonText}>Retour</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryActionButton}
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
                    <Text style={styles.primaryActionButtonText}>Suivant</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {setupStep === 3 && (
              <>
                <SectionTitle title="Étape 3 · Employés" />
                <SectionText text="Ajoute les serveurs et caissiers." />

                {employees.map((employee, index) => (
                  <View key={index} style={styles.block}>
                    <View style={styles.blockHeader}>
                      <Text style={styles.blockTitle}>Employé {index + 1}</Text>
                      <TouchableOpacity onPress={() => removeEmployee(index)}>
                        <Text style={styles.linkDanger}>Supprimer</Text>
                      </TouchableOpacity>
                    </View>

                    <Label text="Nom" />
                    <TextInput
                      value={employee.name}
                      onChangeText={(text) => updateEmployee(index, { name: text })}
                      placeholder="Ex: Laure"
                      style={styles.input}
                    />

                    <Label text="Identifiant" />
                    <TextInput
                      value={employee.identifier}
                      onChangeText={(text) =>
                        updateEmployee(index, { identifier: text })
                      }
                      placeholder="Ex: Laure"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />

                    <Label text="PIN" />
                    <TextInput
                      value={employee.pin}
                      onChangeText={(text) => updateEmployee(index, { pin: text })}
                      placeholder="Minimum 4 chiffres"
                      keyboardType="number-pad"
                      secureTextEntry
                      style={styles.input}
                    />

                    <Label text="Rôle" />
                    <View style={styles.roleRow}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          employee.role === 'server' && styles.roleButtonActive,
                        ]}
                        onPress={() => updateEmployee(index, { role: 'server' })}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            employee.role === 'server' && styles.roleButtonTextActive,
                          ]}
                        >
                          Serveur
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          employee.role === 'cashier' && styles.roleButtonActive,
                        ]}
                        onPress={() => updateEmployee(index, { role: 'cashier' })}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            employee.role === 'cashier' && styles.roleButtonTextActive,
                          ]}
                        >
                          Caissier
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.secondaryButton} onPress={addEmployee}>
                  <Text style={styles.secondaryButtonText}>+ Ajouter un employé</Text>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.secondaryActionButton}
                    onPress={() => setSetupStep(2)}
                  >
                    <Text style={styles.secondaryActionButtonText}>Retour</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={handleFinishSetup}
                  >
                    <Text style={styles.primaryActionButtonText}>Terminer</Text>
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

function StepBadge({ value, active }: { value: string; active: boolean }) {
  return (
    <View style={[styles.stepBadge, active && styles.stepBadgeActive]}>
      <Text style={[styles.stepBadgeText, active && styles.stepBadgeTextActive]}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SectionText({ text }: { text: string }) {
  return <Text style={styles.sectionText}>{text}</Text>;
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function SwitchRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTextBlock}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
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
  scrollContent: {
    padding: 20,
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
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 15,
    color: '#6b7280',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  stepBadgeActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  stepBadgeText: {
    color: '#111827',
    fontWeight: '700',
  },
  stepBadgeTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  switchRow: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  switchTextBlock: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  optionCardActive: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  optionCardDisabled: {
    opacity: 0.45,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  block: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  linkDanger: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  secondaryActionButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  roleButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  roleButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
});