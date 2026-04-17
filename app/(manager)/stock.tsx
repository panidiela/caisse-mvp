import React, { useMemo, useState } from 'react';
import {
  Alert,
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
  zoneId?: string | null;
  sourceType?: string | null;
  sourceLabel?: string | null;
  serverId?: string | null;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  totalAmount: number;
  createdAt?: string | null;
  items?: Array<{ id: string }>;
};

type AppUser = {
  id: string;
  name?: string;
  identifier?: string;
  role?: string;
  isActive?: boolean;
};

type TableAssignment = {
  id: string;
  tableId: string;
  serverUserId: string;
  assignedAt: string;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function FloorManagerScreen() {
  const currentUser = useStore((s) => s.currentUser as AppUser | null);
  const logout = useStore((s) => s.logout);
  const tables = useStore((s) => (s.tables ?? []) as TableItem[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);
  const users = useStore((s) => (s.users ?? []) as AppUser[]);
  const tableAssignments = useStore((s) => (s.tableAssignments ?? []) as TableAssignment[]);
  const hydrateFromDb = useStore((s) => s.hydrateFromDb);
  const assignServerToTable = useStore((s) => s.assignServerToTable);
  const clearTableAssignment = useStore((s) => s.clearTableAssignment);

  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('Jamais');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);

      if (typeof hydrateFromDb === 'function') {
        await Promise.resolve(hydrateFromDb());
      }

      setLastRefreshLabel(new Date().toLocaleString());
    } catch (error) {
      console.error('Floor manager refresh failed', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const servers = useMemo(
    () => users.filter((user) => user.role === 'server' && user.isActive !== false),
    [users]
  );

  const getServerName = (serverId?: string | null) => {
    if (!serverId) return 'Non attribuée';
    const user = users.find((item) => item.id === serverId);
    return user?.name || user?.identifier || 'Serveuse inconnue';
  };

  const getAssignedServerId = (tableId: string) => {
    const assignment = tableAssignments.find((item) => item.tableId === tableId);
    return assignment?.serverUserId ?? null;
  };

  const cycleAssignment = (tableId: string) => {
    if (servers.length === 0) {
      Alert.alert('Aucune serveuse', 'Aucune serveuse active disponible.');
      return;
    }

    const currentAssignedServerId = getAssignedServerId(tableId);
    const currentIndex = servers.findIndex((item) => item.id === currentAssignedServerId);

    if (currentAssignedServerId === null) {
      assignServerToTable(tableId, servers[0].id);
      return;
    }

    if (currentIndex === -1) {
      assignServerToTable(tableId, servers[0].id);
      return;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= servers.length) {
      clearTableAssignment(tableId);
      return;
    }

    assignServerToTable(tableId, servers[nextIndex].id);
  };

  const tableOverview = useMemo(() => {
    return tables.map((table) => {
      const activeSale =
        orders.find(
          (sale) =>
            sale.tableId === table.id &&
            sale.status !== 'PAID' &&
            sale.status !== 'CANCELLED'
        ) ?? null;

      const assignedServerId = getAssignedServerId(table.id);
      const isAssigned = !!assignedServerId;
      const isWaitingToBeTaken = isAssigned && !activeSale;

      return {
        id: table.id,
        name: table.name,
        activeSale,
        assignedServerId,
        isWaitingToBeTaken,
      };
    });
  }, [tables, orders, tableAssignments]);

  const liveSales = useMemo(() => {
    return [...orders]
      .filter((sale) => sale.status !== 'PAID' && sale.status !== 'CANCELLED')
      .sort((a, b) => {
        const aTime = new Date(a.createdAt ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? 0).getTime();
        return bTime - aTime;
      });
  }, [orders]);

  const serverOverview = useMemo(() => {
    return servers.map((server) => {
      const assignedTables = tableOverview.filter(
        (table) => table.assignedServerId === server.id
      );

      const tablesWithActiveSales = assignedTables.filter((table) => !!table.activeSale);
      const tablesWithoutActiveSales = assignedTables.filter((table) => !table.activeSale);

      const sentCount = tablesWithActiveSales.filter(
        (table) => table.activeSale?.status === 'SENT'
      ).length;

      const collectedCount = tablesWithActiveSales.filter(
        (table) => table.activeSale?.status === 'MONEY_COLLECTED'
      ).length;

      return {
        serverId: server.id,
        serverName: server.name || server.identifier || 'Serveuse',
        assignedCount: assignedTables.length,
        activeCount: tablesWithActiveSales.length,
        idleCount: tablesWithoutActiveSales.length,
        sentCount,
        collectedCount,
      };
    });
  }, [servers, tableOverview]);

  const unassignedTables = useMemo(
    () => tableOverview.filter((table) => !table.assignedServerId),
    [tableOverview]
  );

  const assignedWithoutOrder = useMemo(
    () => tableOverview.filter((table) => table.assignedServerId && !table.activeSale),
    [tableOverview]
  );

  const summary = useMemo(() => {
    const tablesFree = tableOverview.filter((item) => !item.activeSale).length;
    const tablesBusy = tableOverview.filter((item) => !!item.activeSale).length;
    const sent = liveSales.filter((sale) => sale.status === 'SENT').length;
    const collected = liveSales.filter(
      (sale) => sale.status === 'MONEY_COLLECTED'
    ).length;

    return {
      tablesTotal: tableOverview.length,
      tablesFree,
      tablesBusy,
      sent,
      collected,
      unassigned: unassignedTables.length,
      assignedWithoutOrder: assignedWithoutOrder.length,
    };
  }, [tableOverview, liveSales, unassignedTables, assignedWithoutOrder]);

  const getStatusBadge = (table: {
    activeSale: Sale | null;
    isWaitingToBeTaken: boolean;
  }) => {
    if (table.isWaitingToBeTaken) {
      return {
        container: styles.badgeToTake,
        text: styles.badgeToTakeText,
        label: 'À prendre',
      };
    }

    switch (table.activeSale?.status) {
      case 'SENT':
        return {
          container: styles.badgeSent,
          text: styles.badgeSentText,
          label: 'Envoyée',
        };
      case 'MONEY_COLLECTED':
        return {
          container: styles.badgeCollected,
          text: styles.badgeCollectedText,
          label: 'Argent reçu',
        };
      case 'DRAFT':
        return {
          container: styles.badgeDraft,
          text: styles.badgeDraftText,
          label: 'Brouillon',
        };
      default:
        return {
          container: styles.badgeFree,
          text: styles.badgeFreeText,
          label: 'Libre',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={true}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Yewo</Text>
            <Text style={styles.title}>Chef de salle</Text>
            <Text style={styles.subtitle}>
              Supervision du service, répartition des tables et suivi des serveuses.
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session active</Text>
          <Text style={styles.rowText}>
            Nom : <Text style={styles.value}>{currentUser?.name || '—'}</Text>
          </Text>
          <Text style={styles.rowText}>
            Identifiant : <Text style={styles.value}>{currentUser?.identifier || '—'}</Text>
          </Text>
          <Text style={styles.rowText}>
            Rôle : <Text style={styles.value}>Chef de salle</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vue service</Text>
          <Text style={styles.rowText}>
            Tables totales : <Text style={styles.value}>{summary.tablesTotal}</Text>
          </Text>
          <Text style={styles.rowText}>
            Tables libres : <Text style={styles.value}>{summary.tablesFree}</Text>
          </Text>
          <Text style={styles.rowText}>
            Tables occupées : <Text style={styles.value}>{summary.tablesBusy}</Text>
          </Text>
          <Text style={styles.rowText}>
            Tables non affectées : <Text style={styles.value}>{summary.unassigned}</Text>
          </Text>
          <Text style={styles.rowText}>
            Tables à prendre : <Text style={styles.value}>{summary.assignedWithoutOrder}</Text>
          </Text>
          <Text style={styles.rowText}>
            Commandes envoyées : <Text style={styles.value}>{summary.sent}</Text>
          </Text>
          <Text style={styles.rowText}>
            Argent reçu : <Text style={styles.value}>{summary.collected}</Text>
          </Text>
          <Text style={styles.rowText}>
            Dernier rafraîchissement : <Text style={styles.value}>{lastRefreshLabel}</Text>
          </Text>

          <Pressable
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshButtonText}>
              {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir la supervision'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Vue par serveuse</Text>

        {serverOverview.length === 0 ? (
          <Text style={styles.emptyText}>Aucune serveuse active disponible.</Text>
        ) : (
          serverOverview.map((item) => (
            <View key={item.serverId} style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>{item.serverName}</Text>
              <Text style={styles.serviceMeta}>
                Tables affectées : {item.assignedCount}
              </Text>
              <Text style={styles.serviceMeta}>
                Tables avec commande en cours : {item.activeCount}
              </Text>
              <Text style={styles.serviceMeta}>
                Tables à prendre : {item.idleCount}
              </Text>
              <Text style={styles.serviceMeta}>
                Commandes envoyées : {item.sentCount}
              </Text>
              <Text style={styles.serviceMeta}>
                Argent reçu : {item.collectedCount}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Tables non affectées</Text>

        {unassignedTables.length === 0 ? (
          <Text style={styles.emptyText}>Toutes les tables sont affectées.</Text>
        ) : (
          unassignedTables.map((table) => (
            <View key={table.id} style={styles.serviceCard}>
              <View style={styles.serviceTopRow}>
                <Text style={styles.serviceTitle}>{table.name}</Text>
                <View style={[styles.badgeBase, styles.badgeDraft]}>
                  <Text style={[styles.badgeBaseText, styles.badgeDraftText]}>
                    À affecter
                  </Text>
                </View>
              </View>

              <Text style={styles.serviceMeta}>
                Montant : {table.activeSale?.totalAmount ?? 0} FCFA
              </Text>

              <Pressable
                style={styles.assignButton}
                onPress={() => cycleAssignment(table.id)}
              >
                <Text style={styles.assignButtonText}>Affecter une serveuse</Text>
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Tables à prendre</Text>

        {assignedWithoutOrder.length === 0 ? (
          <Text style={styles.emptyText}>Aucune table en attente de prise.</Text>
        ) : (
          assignedWithoutOrder.map((table) => (
            <View key={table.id} style={styles.serviceCard}>
              <View style={styles.serviceTopRow}>
                <Text style={styles.serviceTitle}>{table.name}</Text>
                <View style={[styles.badgeBase, styles.badgeToTake]}>
                  <Text style={[styles.badgeBaseText, styles.badgeToTakeText]}>
                    À prendre
                  </Text>
                </View>
              </View>

              <Text style={styles.serviceMeta}>
                Serveuse affectée : {getServerName(table.assignedServerId)}
              </Text>

              <Pressable
                style={styles.assignButton}
                onPress={() => cycleAssignment(table.id)}
              >
                <Text style={styles.assignButtonText}>Changer l’affectation</Text>
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Toutes les tables</Text>

        {tableOverview.length === 0 ? (
          <Text style={styles.emptyText}>Aucune table disponible.</Text>
        ) : (
          tableOverview.map((table) => {
            const badge = getStatusBadge(table);

            return (
              <View key={table.id} style={styles.serviceCard}>
                <View style={styles.serviceTopRow}>
                  <Text style={styles.serviceTitle}>{table.name}</Text>
                  <View style={[styles.badgeBase, badge.container]}>
                    <Text style={[styles.badgeBaseText, badge.text]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceMeta}>
                  Serveuse affectée : {getServerName(table.assignedServerId)}
                </Text>
                <Text style={styles.serviceMeta}>
                  Serveuse sur commande : {getServerName(table.activeSale?.serverId)}
                </Text>
                <Text style={styles.serviceMeta}>
                  Montant : {table.activeSale?.totalAmount ?? 0} FCFA
                </Text>

                <Pressable
                  style={styles.assignButton}
                  onPress={() => cycleAssignment(table.id)}
                >
                  <Text style={styles.assignButtonText}>Changer l’affectation</Text>
                </Pressable>

                <Text style={styles.assignHint}>
                  Appuie plusieurs fois pour faire défiler les serveuses, puis aucune.
                </Text>
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Commandes en cours</Text>

        {liveSales.length === 0 ? (
          <Text style={styles.emptyText}>Aucune commande active.</Text>
        ) : (
          liveSales.map((sale) => {
            const badge =
              sale.status === 'SENT'
                ? {
                    container: styles.badgeSent,
                    text: styles.badgeSentText,
                    label: 'Envoyée',
                  }
                : sale.status === 'MONEY_COLLECTED'
                ? {
                    container: styles.badgeCollected,
                    text: styles.badgeCollectedText,
                    label: 'Argent reçu',
                  }
                : {
                    container: styles.badgeDraft,
                    text: styles.badgeDraftText,
                    label: sale.status,
                  };

            return (
              <View key={sale.id} style={styles.serviceCard}>
                <View style={styles.serviceTopRow}>
                  <Text style={styles.serviceTitle}>
                    {sale.sourceLabel || 'Commande'}
                  </Text>
                  <View style={[styles.badgeBase, badge.container]}>
                    <Text style={[styles.badgeBaseText, badge.text]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceMeta}>
                  Serveuse : {getServerName(sale.serverId)}
                </Text>
                <Text style={styles.serviceMeta}>
                  Montant : {sale.totalAmount} FCFA
                </Text>
                <Text style={styles.serviceMeta}>
                  Créée : {formatDate(sale.createdAt)}
                </Text>
              </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
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
    fontSize: 15,
    lineHeight: 22,
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
  card: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  rowText: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  value: {
    fontWeight: '800',
    color: '#111827',
  },
  refreshButton: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  serviceCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  serviceMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  assignButton: {
    marginTop: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#3730a3',
    fontSize: 14,
    fontWeight: '700',
  },
  assignHint: {
    marginTop: 8,
    fontSize: 12,
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
  badgeDraft: {
    backgroundColor: '#e5e7eb',
  },
  badgeDraftText: {
    color: '#374151',
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
  badgeToTake: {
    backgroundColor: '#ede9fe',
  },
  badgeToTakeText: {
    color: '#6d28d9',
  },
});