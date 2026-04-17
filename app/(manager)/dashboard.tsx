import React, { useMemo, useState } from 'react';
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
import { getShiftsForManager, type ManagerShiftRow } from '../../src/db/manager.persistence';
import {
  getRecentStockMovementsForManager,
  getStockForManager,
  type ManagerStockMovementRow,
  type ManagerStockRow,
} from '../../src/db/stock.read.persistence';
import {
  getRecentShiftDiscrepancies,
  type ShiftDiscrepancyRow,
} from '../../src/db/shift.discrepancies.read.persistence';

type AppRole = 'server' | 'cashier' | 'manager' | 'admin' | 'stockist';

type Sale = {
  id: string;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  sourceLabel?: string | null;
  totalAmount: number;
  createdAt?: string;
  items?: Array<{ id: string }>;
};

function getRoleLabel(role?: AppRole) {
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
      return 'Utilisateur';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ManagerDashboardScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const establishment = useStore((s) => s.establishment);
  const users = useStore((s) => s.users ?? []);
  const products = useStore((s) => s.products ?? []);
  const tables = useStore((s) => s.tables ?? []);
  const zones = useStore((s) => s.zones ?? []);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);
  const hydrateFromDb = useStore((s) => s.hydrateFromDb);

  const [shiftRows, setShiftRows] = useState<ManagerShiftRow[]>(() => getShiftsForManager());
  const [stockRows, setStockRows] = useState<ManagerStockRow[]>(() => getStockForManager());
  const [stockMovements, setStockMovements] = useState<ManagerStockMovementRow[]>(
    () => getRecentStockMovementsForManager()
  );
  const [shiftDiscrepancies, setShiftDiscrepancies] = useState<ShiftDiscrepancyRow[]>(
    () => getRecentShiftDiscrepancies()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('Jamais');

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

      setShiftRows(getShiftsForManager());
      setStockRows(getStockForManager());
      setStockMovements(getRecentStockMovementsForManager());
      setShiftDiscrepancies(getRecentShiftDiscrepancies());
      setLastRefreshLabel(new Date().toLocaleString());
    } catch (error) {
      console.error('Manager refresh failed', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalSales = orders.length;

  const pendingCount = useMemo(
    () => orders.filter((sale) => sale.status === 'MONEY_COLLECTED').length,
    [orders]
  );

  const paidCount = useMemo(
    () => orders.filter((sale) => sale.status === 'PAID').length,
    [orders]
  );

  const paidRevenue = useMemo(
    () =>
      orders
        .filter((sale) => sale.status === 'PAID')
        .reduce((sum, sale) => sum + Number(sale.totalAmount ?? 0), 0),
    [orders]
  );

  const lowStockCount = useMemo(
    () => stockRows.filter((item) => item.isLowStock).length,
    [stockRows]
  );

  const latestSales = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [orders]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Yewo</Text>
            <Text style={styles.title}>Tableau de bord manager</Text>
            <Text style={styles.subtitle}>
              Vue simple pour suivre l’activité, les ventes, les shifts et le stock.
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
            Rôle :{' '}
            <Text style={styles.value}>
              {getRoleLabel(currentUser?.role as AppRole | undefined)}
            </Text>
          </Text>
          <Text style={styles.rowText}>
            Identifiant :{' '}
            <Text style={styles.value}>
              {currentUser?.identifier || currentUser?.username || '—'}
            </Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Établissement</Text>
          <Text style={styles.rowText}>
            Nom :{' '}
            <Text style={styles.value}>
              {establishment?.name || establishment?.establishmentName || 'Non défini'}
            </Text>
          </Text>
          <Text style={styles.rowText}>
            Ville : <Text style={styles.value}>{establishment?.city || '—'}</Text>
          </Text>
          <Text style={styles.rowText}>
            Utilisateurs : <Text style={styles.value}>{users.length}</Text>
          </Text>
          <Text style={styles.rowText}>
            Produits : <Text style={styles.value}>{products.length}</Text>
          </Text>
          <Text style={styles.rowText}>
            Zones : <Text style={styles.value}>{zones.length}</Text>
          </Text>
          <Text style={styles.rowText}>
            Tables : <Text style={styles.value}>{tables.length}</Text>
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Résumé ventes</Text>
          <Text style={styles.rowText}>
            Total ventes : <Text style={styles.value}>{totalSales}</Text>
          </Text>
          <Text style={styles.rowText}>
            En attente caisse : <Text style={styles.value}>{pendingCount}</Text>
          </Text>
          <Text style={styles.rowText}>
            Payées : <Text style={styles.value}>{paidCount}</Text>
          </Text>
          <Text style={styles.rowText}>
            Total encaissé : <Text style={styles.value}>{paidRevenue} FCFA</Text>
          </Text>
          <Text style={styles.rowText}>
            Dernier rafraîchissement : <Text style={styles.value}>{lastRefreshLabel}</Text>
          </Text>

          <Pressable
            style={[
              styles.refreshButton,
              isRefreshing && styles.refreshButtonDisabled,
            ]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshButtonText}>
              {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir les données'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Résumé stock</Text>
          <Text style={styles.rowText}>
            Produits suivis : <Text style={styles.value}>{stockRows.length}</Text>
          </Text>
          <Text style={styles.rowText}>
            Alertes stock bas : <Text style={styles.value}>{lowStockCount}</Text>
          </Text>
          <Text style={styles.rowText}>
            Écarts de shift récents : <Text style={styles.value}>{shiftDiscrepancies.length}</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Écarts de shift récents</Text>

        {shiftDiscrepancies.length === 0 ? (
          <Text style={styles.emptyText}>Aucun écart de shift enregistré.</Text>
        ) : (
          shiftDiscrepancies.map((item) => (
            <View key={item.id} style={styles.saleCard}>
              <Text style={styles.saleTitle}>{item.productName}</Text>
              <Text style={styles.saleMeta}>Caissière : {item.cashierName}</Text>
              <Text style={styles.saleMeta}>Attendu : {item.expectedQty}</Text>
              <Text style={styles.saleMeta}>Réel : {item.actualQty}</Text>
              <Text style={styles.saleMeta}>Écart : {item.difference}</Text>
              <Text style={styles.saleMeta}>Date : {formatDate(item.createdAt)}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Stock actuel</Text>

        {stockRows.length === 0 ? (
          <Text style={styles.emptyText}>Aucun stock disponible.</Text>
        ) : (
          stockRows.map((stock) => (
            <View key={stock.productId} style={styles.stockCard}>
              <View style={styles.saleTopRow}>
                <Text style={styles.saleTitle}>{stock.productName}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    stock.isLowStock ? styles.statusPending : styles.statusPaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      stock.isLowStock ? styles.statusPendingText : styles.statusPaidText,
                    ]}
                  >
                    {stock.isLowStock ? 'STOCK BAS' : 'OK'}
                  </Text>
                </View>
              </View>

              <Text style={styles.saleMeta}>Quantité actuelle : {stock.quantity}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Mouvements de stock récents</Text>

        {stockMovements.length === 0 ? (
          <Text style={styles.emptyText}>Aucun mouvement de stock enregistré.</Text>
        ) : (
          stockMovements.map((movement) => (
            <View key={movement.id} style={styles.saleCard}>
              <Text style={styles.saleTitle}>{movement.productName}</Text>
              <Text style={styles.saleMeta}>Variation : {movement.quantityDelta}</Text>
              <Text style={styles.saleMeta}>Raison : {movement.reason}</Text>
              <Text style={styles.saleMeta}>Vente : {movement.saleId || '—'}</Text>
              <Text style={styles.saleMeta}>Shift : {movement.shiftId || '—'}</Text>
              <Text style={styles.saleMeta}>Date : {formatDate(movement.createdAt)}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Shifts enregistrés</Text>

        {shiftRows.length === 0 ? (
          <Text style={styles.emptyText}>Aucun shift enregistré.</Text>
        ) : (
          shiftRows.map((shift) => (
            <View key={shift.id} style={styles.saleCard}>
              <View style={styles.saleTopRow}>
                <Text style={styles.saleTitle}>{shift.cashierName}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    shift.status === 'OPEN' ? styles.statusPending : styles.statusPaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      shift.status === 'OPEN'
                        ? styles.statusPendingText
                        : styles.statusPaidText,
                    ]}
                  >
                    {shift.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.saleMeta}>Ouvert : {formatDate(shift.openedAt)}</Text>
              <Text style={styles.saleMeta}>Fermé : {formatDate(shift.closedAt)}</Text>
              <Text style={styles.saleMeta}>Total ventes payées : {shift.totalSalesPaid} FCFA</Text>
              <Text style={styles.saleMeta}>Cash : {shift.totalCash} FCFA</Text>
              <Text style={styles.saleMeta}>Mobile money : {shift.totalMobileMoney} FCFA</Text>
              <Text style={styles.saleMeta}>Other : {shift.totalOther} FCFA</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Dernières ventes</Text>

        {latestSales.length === 0 ? (
          <Text style={styles.emptyText}>Aucune vente enregistrée.</Text>
        ) : (
          latestSales.map((item) => (
            <View key={item.id} style={styles.saleCard}>
              <View style={styles.saleTopRow}>
                <Text style={styles.saleTitle}>{item.sourceLabel || 'Vente'}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'PAID'
                      ? styles.statusPaid
                      : item.status === 'MONEY_COLLECTED'
                      ? styles.statusPending
                      : styles.statusOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      item.status === 'PAID'
                        ? styles.statusPaidText
                        : item.status === 'MONEY_COLLECTED'
                        ? styles.statusPendingText
                        : styles.statusOtherText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.saleMeta}>Montant : {item.totalAmount} FCFA</Text>
              <Text style={styles.saleMeta}>
                Articles : {Array.isArray(item.items) ? item.items.length : 0}
              </Text>
              <Text style={styles.saleMeta}>Créée : {formatDate(item.createdAt)}</Text>
            </View>
          ))
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
  saleCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stockCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  saleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  saleMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
  },
  statusPaidText: {
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusPendingText: {
    color: '#92400e',
  },
  statusOther: {
    backgroundColor: '#e5e7eb',
  },
  statusOtherText: {
    color: '#374151',
  },
  emptyText: {
    marginTop: 12,
    color: '#6b7280',
  },
});