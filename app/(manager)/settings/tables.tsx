import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Screen } from '../../../src/components/ui/Screen';
import { useStore } from '../../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../../src/constants/theme';

export default function TablesZonesConfig() {
  const {
    zones,
    tables,
    addZone,
    addTable,
    toggleZone,
    toggleTable,
    establishment,
  } = useStore();

  const config = establishment.configuration;

  const [zoneName, setZoneName] = useState('');
  const [tableName, setTableName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // ======================
  // ZONES
  // ======================

  const handleAddZone = () => {
    if (!zoneName.trim()) return;

    addZone(zoneName.trim());
    setZoneName('');
  };

  // ======================
  // TABLES
  // ======================

  const handleAddTable = () => {
    if (!tableName.trim()) return;

    addTable(tableName.trim(), selectedZoneId);
    setTableName('');
  };

  // ======================
  // RENDER
  // ======================

  return (
    <Screen title="Configuration">
      <View style={s.container}>

        {/* ================== ZONES ================== */}
        {config.usesZones && (
          <View style={s.block}>
            <Text style={s.title}>Zones</Text>

            <FlatList
              data={zones}
              keyExtractor={(z) => z.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.item}
                  onPress={() => toggleZone(item.id)}
                >
                  <Text style={s.itemText}>{item.name}</Text>
                  <Text style={s.status}>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={s.row}>
              <TextInput
                placeholder="Nouvelle zone"
                value={zoneName}
                onChangeText={setZoneName}
                style={s.input}
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAddZone}>
                <Text style={s.addText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================== TABLES ================== */}
        {config.usesTables && (
          <View style={s.block}>
            <Text style={s.title}>Tables</Text>

            {/* Sélection zone (optionnelle) */}
            {config.usesZones && (
              <View style={s.zoneSelector}>
                <TouchableOpacity
                  style={[
                    s.zoneBtn,
                    selectedZoneId === null && s.zoneBtnActive,
                  ]}
                  onPress={() => setSelectedZoneId(null)}
                >
                  <Text>Sans zone</Text>
                </TouchableOpacity>

                {zones.map((z) => (
                  <TouchableOpacity
                    key={z.id}
                    style={[
                      s.zoneBtn,
                      selectedZoneId === z.id && s.zoneBtnActive,
                    ]}
                    onPress={() => setSelectedZoneId(z.id)}
                  >
                    <Text>{z.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <FlatList
              data={tables}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.item}
                  onPress={() => toggleTable(item.id)}
                >
                  <View>
                    <Text style={s.itemText}>{item.name}</Text>
                    {item.zoneId && (
                      <Text style={s.subText}>
                        {
                          zones.find((z) => z.id === item.zoneId)?.name
                        }
                      </Text>
                    )}
                  </View>

                  <Text style={s.status}>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={s.row}>
              <TextInput
                placeholder="Nouvelle table"
                value={tableName}
                onChangeText={setTableName}
                style={s.input}
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAddTable}>
                <Text style={s.addText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================== MODE SIMPLE ================== */}
        {!config.usesZones && !config.usesTables && (
          <View style={s.simple}>
            <Text style={s.simpleTitle}>Mode simple activé</Text>
            <Text style={s.simpleText}>
              Aucune table ni zone. Les serveurs créent directement des factures.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
  },

  block: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.sm,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },

  itemText: {
    fontSize: 15,
    fontWeight: '600',
  },

  subText: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  status: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
  },

  addBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

  zoneSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  zoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  zoneBtnActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },

  simple: {
    alignItems: 'center',
    padding: 20,
  },

  simpleTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  simpleText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
});