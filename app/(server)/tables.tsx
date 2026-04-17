import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../../src/store/useStore';

type TableItem = {
  id: string;
  name: string;
  zoneId?: string | null;
  status?: string;
};

type Sale = {
  id: string;
  tableId?: string | null;
  sourceLabel?: string | null;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  totalAmount: number;
};

export default function ServerTablesScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const tables = useStore((s) => (s.tables ?? []) as TableItem[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const tableCards = useMemo(() => {
    return tables.map((table) => {
      const activeSale = orders.find(
        (sale) =>
          sale.tableId === table.id &&
          sale.status !== 'PAID' &&
          sale.status !== 'CANCELLED'
      );

      const uiStatus = activeSale ? activeSale.status : 'FREE';

      return {
        ...table,
        activeSale,
        uiStatus,
      };
    });
  }, [tables, orders]);

  const summary = useMemo(() => {
    const free = tableCards.filter((item) => item.uiStatus === 'FREE').length;
    const sent = tableCards.filter((item) => item.uiStatus === 'SENT').length;
    const collected = tableCards.filter(
      (item) => item.uiStatus === 'MONEY_COLLECTED'
    ).length;

    return {
      total: tableCards.length,
      free,
      sent,
      collected,
    };
  }, [tableCards]);

  const goToTableOrder = (tableId: string, tableName: string) => {
    router.push({
      pathname: '/(server)/order',
      params: {
        tableId,
        sourceType: 'table',
        sourceLabel: tableName,
      },
    });
  };

  const getBadgeStyle = (status: string) => {
    if (status === 'FREE') {
      return {
        container: styles.badgeFree,
        text: styles.badgeFreeText,
        label: 'Libre',
      };
    }

    if (status === 'SENT') {
      return {
        container: styles.badgeSent,
        text: styles.badgeSentText,
        label: 'Envoyée',
      };
    }

    if (status === 'MONEY_COLLECTED') {
      return {
        container: styles.badgeCollected,
        text: styles.badgeCollectedText,
        label: 'Argent reçu',
      };
    }

    return {
      container: styles.badgeOther,
      text: styles.badgeOtherText,
      label: status,
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.brand}>Yewo</Text>
            <Text style={styles.title}>Tables</Text>
            <Text style={styles.subtitle}>
              Connecté : {currentUser?.name || currentUser?.identifier || 'Serveuse'}
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé salle</Text>
          <Text style={styles.summaryText}>
            Total tables : <Text style={styles.summaryValue}>{summary.total}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Libres : <Text style={styles.summaryValue}>{summary.free}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Commandes envoyées : <Text style={styles.summaryValue}>{summary.sent}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Argent reçu : <Text style={styles.summaryValue}>{summary.collected}</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choisir une table</Text>

        {tableCards.length === 0 ? (
          <Text style={styles.emptyText}>Aucune table disponible.</Text>
        ) : (
          tableCards.map((table) => {
            const badge = getBadgeStyle(table.uiStatus);

            return (
              <Pressable
                key={table.id}
                style={styles.tableCard}
                onPress={() => goToTableOrder(table.id, table.name)}
              >
                <View style={styles.tableTopRow}>
                  <Text style={styles.tableName}>{table.name}</Text>

                  <View style={[styles.badgeBase, badge.container]}>
                    <Text style={[styles.badgeBaseText, badge.text]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.tableMeta}>
                  {table.activeSale
                    ? `Commande en cours • ${table.activeSale.totalAmount} FCFA`
                    : 'Aucune commande en cours'}
                </Text>

                <Text style={styles.tableHint}>
                  Appuyer pour ouvrir ou reprendre la commande
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topBarLeft: {
    flex: 1,
    marginRight: 12,
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
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    marginTop: 4,
    fontSize: 14,
    color: '#4b5563',
  },
  summaryValue: {
    fontWeight: '800',
    color: '#111827',
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    marginTop: 12,
    color: '#6b7280',
  },
  tableCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    flex: 1,
    marginRight: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  tableMeta: {
    marginTop: 10,
    fontSize: 14,
    color: '#4b5563',
  },
  tableHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
  },
  badgeBase: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeBaseText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeFree: {
    backgroundColor: '#dcfce7',
  },
  badgeFreeText: {
    color: '#166534',
  },
  badgeSent: {
    backgroundColor: '#dbeafe',
  },
  badgeSentText: {
    color: '#1d4ed8',
  },
  badgeCollected: {
    backgroundColor: '#fef3c7',
  },
  badgeCollectedText: {
    color: '#92400e',
  },
  badgeOther: {
    backgroundColor: '#e5e7eb',
  },
  badgeOtherText: {
    color: '#374151',
  },
});