import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../../src/constants/theme';
import { ServiceMode } from '../../../src/types';

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

export default function EstablishmentScreen() {
  const { establishment, updateEstablishment } = useStore();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const [hasCounter, setHasCounter] = useState(true);
  const [usesZones, setUsesZones] = useState(false);
  const [usesTables, setUsesTables] = useState(false);
  const [usesNumberedTables, setUsesNumberedTables] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('free');

  useEffect(() => {
    if (!establishment) return;

    setName(establishment.name || '');
    setCity(establishment.city || '');

    const config = establishment.configuration;
    setHasCounter(config?.hasCounter ?? true);
    setUsesZones(config?.usesZones ?? false);
    setUsesTables(config?.usesTables ?? false);
    setUsesNumberedTables(config?.usesNumberedTables ?? false);
    setServiceMode(config?.serviceMode ?? 'free');
  }, [establishment]);

  const effectiveServiceMode = useMemo<ServiceMode>(() => {
    if (!usesZones && serviceMode === 'by_zone') return 'free';
    if (!usesTables && serviceMode === 'by_table') return 'free';
    return serviceMode;
  }, [usesZones, usesTables, serviceMode]);

  const handleSave = () => {
    const result = updateEstablishment({
      name,
      city: city.trim() || null,
      configuration: {
        hasCounter,
        usesZones,
        usesTables,
        usesNumberedTables: usesTables ? usesNumberedTables : false,
        serviceMode: effectiveServiceMode,
      },
    });

    if (!result.ok) {
      Alert.alert('Erreur', result.error || 'Impossible de sauvegarder.');
      return;
    }

    Alert.alert('Succès', 'Les informations de l’établissement ont été mises à jour.');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🏢 Établissement</Text>
        <Text style={s.subtitle}>
          Modifie les informations générales et la structure réelle du lieu.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations générales</Text>

          <View style={s.field}>
            <Text style={s.label}>Nom de l’établissement</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Nom de l’établissement"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Ville</Text>
            <TextInput
              style={s.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ville"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Structure du lieu</Text>

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
                  Active si les tables ont de vrais numéros.
                </Text>
              </View>
              <Switch
                value={usesNumberedTables}
                onValueChange={setUsesNumberedTables}
              />
            </View>
          )}
        </View>

        <View style={s.section}>
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
                      effectiveServiceMode === option.key &&
                        s.modeDescriptionActive,
                      disabled && s.modeDescriptionDisabled,
                    ]}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={handleSave}>
          <Text style={s.primaryBtnText}>Sauvegarder</Text>
        </TouchableOpacity>
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
    paddingBottom: 32,
    gap: 18,
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

  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.sm,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  field: {
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

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },

  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});