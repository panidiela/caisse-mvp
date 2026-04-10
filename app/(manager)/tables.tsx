import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../src/store/useStore';

export default function TablesManagerScreen() {
  const { tables, addTablesForZone, renameTable, removeTable } = useStore();

  const [zoneName, setZoneName] = useState('');
  const [tableCount, setTableCount] = useState('');
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');

  const groupedTables = useMemo(() => {
    const groups: Record<string, { id: string; name: string; status: string }[]> = {};

    tables.forEach((table) => {
      const parts = table.name.split(' ');
      const zone =
        parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Autres';

      if (!groups[zone]) groups[zone] = [];
      groups[zone].push({
        id: table.id,
        name: table.name,
        status: table.status,
      });
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tables]);

  const handleAddZone = () => {
    const count = parseInt(tableCount, 10);

    const result = addTablesForZone(zoneName, count);

    if (!result.ok) {
      Alert.alert('Erreur', result.error || 'Impossible d’ajouter la zone.');
      return;
    }

    setZoneName('');
    setTableCount('');
    Alert.alert('Succès', 'Zone et tables ajoutées.');
  };

  const handleStartRename = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
  };

  const handleSaveRename = () => {
    if (!editingTableId) return;

    const result = renameTable(editingTableId, editingTableName);

    if (!result.ok) {
      Alert.alert('Erreur', result.error || 'Impossible de renommer la table.');
      return;
    }

    setEditingTableId(null);
    setEditingTableName('');
    Alert.alert('Succès', 'Table renommée.');
  };

  const handleDeleteTable = (tableId: string, tableName: string) => {
    Alert.alert(
      'Supprimer cette table ?',
      tableName,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const result = removeTable(tableId);

            if (!result.ok) {
              Alert.alert('Erreur', result.error || 'Impossible de supprimer cette table.');
              return;
            }

            Alert.alert('Succès', 'Table supprimée.');
          },
        },
      ]
    );
  };

  const statusLabel = (status: string) => {
    if (status === 'free') return 'Libre';
    if (status === 'occupied') return 'Occupée';
    if (status === 'waiting_payment') return 'Addition';
    return 'Payée';
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🪑 Tables & zones</Text>
        <Text style={s.subtitle}>
          Ajoutez des zones, générez des tables, renommez ou supprimez-les.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ajouter une zone</Text>

          <TextInput
            style={s.input}
            placeholder="Nom de la zone (ex: Terrasse)"
            value={zoneName}
            onChangeText={setZoneName}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            style={s.input}
            placeholder="Nombre de tables"
            value={tableCount}
            onChangeText={setTableCount}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity style={s.primaryBtn} onPress={handleAddZone}>
            <Text style={s.primaryBtnText}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Zones existantes</Text>

          {groupedTables.length === 0 ? (
            <Text style={s.empty}>Aucune table configurée.</Text>
          ) : (
            groupedTables.map(([zone, zoneTables]) => (
              <View key={zone} style={s.zoneCard}>
                <Text style={s.zoneTitle}>
                  {zone} ({zoneTables.length})
                </Text>

                {zoneTables.map((table) => (
                  <View key={table.id} style={s.tableRow}>
                    {editingTableId === table.id ? (
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={s.input}
                          value={editingTableName}
                          onChangeText={setEditingTableName}
                          placeholder="Nom de la table"
                          placeholderTextColor="#9CA3AF"
                        />
                        <View style={s.inlineActions}>
                          <TouchableOpacity style={s.saveBtn} onPress={handleSaveRename}>
                            <Text style={s.inlineBtnText}>Enregistrer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.cancelBtn}
                            onPress={() => {
                              setEditingTableId(null);
                              setEditingTableName('');
                            }}
                          >
                            <Text style={s.inlineBtnText}>Annuler</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={{ flex: 1 }}>
                          <Text style={s.tableName}>{table.name}</Text>
                          <Text style={s.tableStatus}>{statusLabel(table.status)}</Text>
                        </View>

                        <View style={s.rowActions}>
                          <TouchableOpacity
                            style={s.smallBtn}
                            onPress={() => handleStartRename(table.id, table.name)}
                          >
                            <Text style={s.smallBtnText}>Renommer</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[s.smallBtn, s.deleteSmallBtn]}
                            onPress={() => handleDeleteTable(table.id, table.name)}
                          >
                            <Text style={s.smallBtnText}>Supprimer</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  zoneCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  tableRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  tableStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  deleteSmallBtn: {
    backgroundColor: '#EF4444',
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  inlineBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  primaryBtn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  empty: {
    color: '#6B7280',
    fontSize: 14,
  },
});