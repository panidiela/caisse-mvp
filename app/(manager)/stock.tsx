import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import uuid from 'react-native-uuid';
import { router } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { adjustStockManually } from '../../src/db/stock.persistence';
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

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function StockistScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

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

  const reloadData = () => {
    setStockRows(getStockForManager());
    setStockMovements(getRecentStockMovementsForManager());
    setShiftDiscrepancies(getRecentShiftDiscrepancies());
    setLastRefreshLabel(new Date().toLocaleString());
  };

  const handleRefresh = () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      reloadData();
    } catch (error) {
      console.error('Stock refresh failed', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdjustStock = (productId: string, delta: number) => {
    if (!currentUser?.id) {
      Alert.alert('Erreur', 'Aucun utilisateur connecté.');
      return;
    }

    try {
      adjustStockManually({
        id: uuid.v4() as string,
        productId,
        quantityDelta: delta,
        createdByUserId: currentUser.id,
        note: delta > 0 ? 'Ajout manuel stockiste' : 'Retrait manuel stockiste',
      });

      reloadData();
    } catch (error) {
      console.error('Adjust stock failed', error);
      Alert.alert('Erreur', "Impossible d'ajuster le stock.");
    }
  };

  const lowStockCount = stockRows.filter((item) => item.isLowStock).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={true}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Yewo</Text>
            <Text style={styles.title}>Espace stockiste</Text>
            <Text style={styles.subtitle}>
              Vue dédiée au suivi du stock, aux alertes, aux ajustements et aux écarts de shift.
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
            Rôle : <Text style={styles.value}>{currentUser?.role || '—'}</Text>
          </Text>
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
          <Text style={styles.rowText}>
            Dernier rafraîchissement : <Text style={styles.value}>{lastRefreshLabel}</Text>
          </Text>

          <Pressable
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshButtonText}>
              {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir le stock'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Écarts de shift récents</Text>

        {shiftDiscrepancies.length === 0 ? (
          <Text style={styles.emptyText}>Aucun écart de shift enregistré.</Text>
        ) : (
          shiftDiscrepancies.map((item) => (
            <View key={item.id} style={styles.stockCard}>
              <Text style={styles.stockTitle}>{item.productName}</Text>
              <Text style={styles.metaText}>Caissière : {item.cashierName}</Text>
              <Text style={styles.metaText}>Attendu : {item.expectedQty}</Text>
              <Text style={styles.metaText}>Réel : {item.actualQty}</Text>
              <Text style={styles.metaText}>Écart : {item.difference}</Text>
              <Text style={styles.metaText}>Date : {formatDate(item.createdAt)}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Stock actuel</Text>

        {stockRows.length === 0 ? (
          <Text style={styles.emptyText}>Aucun stock disponible.</Text>
        ) : (
          stockRows.map((stock) => (
            <View key={stock.productId} style={styles.stockCard}>
              <View style={styles.topRow}>
                <Text style={styles.stockTitle}>{stock.productName}</Text>

                <View
                  style={[
                    styles.badge,
                    stock.isLowStock ? styles.badgeWarning : styles.badgeOk,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      stock.isLowStock ? styles.badgeWarningText : styles.badgeOkText,
                    ]}
                  >
                    {stock.isLowStock ? 'STOCK BAS' : 'OK'}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>Quantité actuelle : {stock.quantity}</Text>

              <View style={styles.adjustRow}>
                <Pressable
                  style={styles.minusButton}
                  onPress={() => handleAdjustStock(stock.productId, -1)}
                >
                  <Text style={styles.adjustButtonText}>-1</Text>
                </Pressable>

                <Pressable
                  style={styles.plusButton}
                  onPress={() => handleAdjustStock(stock.productId, 1)}
                >
                  <Text style={styles.adjustButtonText}>+1</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Mouvements récents</Text>

        {stockMovements.length === 0 ? (
          <Text style={styles.emptyText}>Aucun mouvement de stock enregistré.</Text>
        ) : (
          stockMovements.map((movement) => (
            <View key={movement.id} style={styles.stockCard}>
              <Text style={styles.stockTitle}>{movement.productName}</Text>
              <Text style={styles.metaText}>Variation : {movement.quantityDelta}</Text>
              <Text style={styles.metaText}>Raison : {movement.reason}</Text>
              <Text style={styles.metaText}>Vente : {movement.saleId || '—'}</Text>
              <Text style={styles.metaText}>Shift : {movement.shiftId || '—'}</Text>
              <Text style={styles.metaText}>Date : {formatDate(movement.createdAt)}</Text>
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
  stockCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  metaText: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeOk: {
    backgroundColor: '#dcfce7',
  },
  badgeOkText: {
    color: '#166534',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
  },
  badgeWarningText: {
    color: '#92400e',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  minusButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  plusButton: {
    flex: 1,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    marginTop: 12,
    color: '#6b7280',
  },
});