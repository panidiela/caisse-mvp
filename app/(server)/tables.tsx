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
  serverId?: string | null;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  totalAmount: number;
};

type TableAssignment = {
  id: string;
  tableId: string;
  serverUserId: string;
  assignedAt: string;
};

export default function ServerTablesScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const tables = useStore((s) => (s.tables ?? []) as TableItem[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);
  const tableAssignments = useStore(
    (s) => (s.tableAssignments ?? []) as TableAssignment[]
  );

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const hasAnyAssignments = tableAssignments.length > 0;

  const visibleTables = useMemo(() => {
    if (!hasAnyAssignments) {
      return tables;
    }

    const myAssignedTableIds = new Set(
      tableAssignments
        .filter((item) => item.serverUserId === currentUser?.id)
        .map((item) => item.tableId)
    );

    return tables.filter((table) => myAssignedTableIds.has(table.id));
  }, [tables, tableAssignments, currentUser?.id, hasAnyAssignments]);

  const tableCards = useMemo(() => {
    return visibleTables.map((table) => {
      const activeSale =
        orders.find(
          (sale) =>
            sale.tableId === table.id &&
            sale.status !== 'PAID' &&
            sale.status !== 'CANCELLED'
        ) ?? null;

      const assignment =
        tableAssignments.find((item) => item.tableId === table.id) ?? null;

      const isAssignedToMe =
        !!currentUser?.id && assignment?.serverUserId === currentUser.id;

      const isToTake = isAssignedToMe && !activeSale;
      const uiStatus = isToTake ? 'TO_TAKE' : activeSale ? activeSale.status : 'FREE';

      return {
        ...table,
        activeSale,
        uiStatus,
      };
    });
  }, [visibleTables, orders, tableAssignments, currentUser?.id]);

  const summary = useMemo(() => {
    const free = tableCards.filter((item) => item.uiStatus === 'FREE').length;
    const toTake = tableCards.filter((item) => item.uiStatus === 'TO_TAKE').length;
    const sent = tableCards.filter((item) => item.uiStatus === 'SENT').length;
    const collected = tableCards.filter(
      (item) => item.uiStatus === 'MONEY_COLLECTED'
    ).length;

    return {
      totalVisible: tableCards.length,
      hasAnyAssignments,
      free,
      toTake,
      sent,
      collected,
    };
  }, [tableCards, hasAnyAssignments]);

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
    if (status === 'TO_TAKE') {
      return {
        container: styles.badgeToTake,
        text: styles.badgeToTakeText,
        label: 'À prendre',
      };
    }

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
            <Text style={styles.title}>Mes tables</Text>
            <Text style={styles.subtitle}>
              Connecté : {currentUser?.name || currentUser?.identifier || 'Serveuse'}
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé service</Text>
          <Text style={styles.summaryText}>
            Affectation active :{' '}
            <Text style={styles.summaryValue}>
              {hasAnyAssignments ? 'Oui' : 'Non'}
            </Text>
          </Text>
          <Text style={styles.summaryText}>
            Tables visibles : <Text style={styles.summaryValue}>{summary.totalVisible}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Tables à prendre : <Text style={styles.summaryValue}>{summary.toTake}</Text>
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

        <Text style={styles.sectionTitle}>
          {hasAnyAssignments ? 'Tables qui me sont affectées' : 'Toutes les tables'}
        </Text>

        {tableCards.length === 0 ? (
          <Text style={styles.emptyText}>
            {hasAnyAssignments
              ? "Aucune table ne t'est affectée pour le moment."
              : 'Aucune table disponible.'}
          </Text>
        ) : (
          tableCards.map((table) => {
            const badge = getBadgeStyle(table.uiStatus);

            return (
              <Pressable
                key={table.id}
                style={[styles.tableCard, table.uiStatus === 'TO_TAKE' && styles.toTakeCard]}
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
                    : table.uiStatus === 'TO_TAKE'
                    ? 'Table affectée, en attente de prise'
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
  toTakeCard: {
    borderColor: '#8b5cf6',
    borderWidth: 2,
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
  badgeToTake: {
    backgroundColor: '#ede9fe',
  },
  badgeToTakeText: {
    color: '#6d28d9',
  },
});