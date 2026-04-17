import React, { useEffect, useMemo, useState } from 'react';
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
import uuid from 'react-native-uuid';
import { useStore } from '../../src/store/useStore';
import { getAllStockRows } from '../../src/db/stock.persistence';
import {
  closeShiftRecord,
  getLatestShiftForCashier,
  getOpenShiftForCashier,
  openShiftRecord,
} from '../../src/db/shifts.persistence';

type Product = {
  id: string;
  name: string;
  price?: number;
};

type Sale = {
  id: string;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
};

type ShiftCountItem = {
  productId: string;
  productName: string;
  openingQty: number;
  closingQty: number;
};

function clampToZero(value: number) {
  return value < 0 ? 0 : value;
}

type QtyControlProps = {
  label: string;
  value: number;
  editable: boolean;
  onMinus: () => void;
  onPlus: () => void;
};

function QtyControl({ label, value, editable, onMinus, onPlus }: QtyControlProps) {
  return (
    <View style={styles.qtySection}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.qtyRow}>
        <Pressable
          style={[styles.qtyActionButton, !editable && styles.qtyActionButtonDisabled]}
          onPress={onMinus}
          disabled={!editable}
        >
          <Text style={styles.qtyActionButtonText}>−</Text>
        </Pressable>

        <View style={styles.qtyValueBox}>
          <Text style={styles.qtyValueText}>{value}</Text>
        </View>

        <Pressable
          style={[styles.qtyActionButton, !editable && styles.qtyActionButtonDisabled]}
          onPress={onPlus}
          disabled={!editable}
        >
          <Text style={styles.qtyActionButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ShiftScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const products = useStore((s) => (s.products ?? []) as Product[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);

  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [latestShiftLabel, setLatestShiftLabel] = useState<string>('Aucun shift enregistré');
  const [shiftTotals, setShiftTotals] = useState({
    totalSalesPAID: 0,
    cash: 0,
    mobile_money: 0,
    other: 0,
  });
  const [counts, setCounts] = useState<ShiftCountItem[]>([]);
  const [showDiscrepancyReview, setShowDiscrepancyReview] = useState(false);

  useEffect(() => {
    setCounts((prev) => {
      const prevMap = new Map(prev.map((item) => [item.productId, item]));

      return products.map((product) => {
        const existing = prevMap.get(product.id);

        return {
          productId: product.id,
          productName: product.name,
          openingQty: existing?.openingQty ?? 0,
          closingQty: existing?.closingQty ?? 0,
        };
      });
    });
  }, [products]);

  const refreshShiftState = () => {
    if (!currentUser?.id) return;

    const openShift = getOpenShiftForCashier(currentUser.id);

    if (openShift) {
      setIsShiftOpen(true);
      setActiveShiftId(openShift.id);
      setShiftTotals({
        totalSalesPAID: openShift.totalSalesPAID ?? 0,
        cash: openShift.totalByPaymentMode?.cash ?? 0,
        mobile_money: openShift.totalByPaymentMode?.mobile_money ?? 0,
        other: openShift.totalByPaymentMode?.other ?? 0,
      });
      setLatestShiftLabel(
        `${openShift.status} • ouverture ${new Date(openShift.openedAt).toLocaleString()}`
      );
      return;
    }

    setIsShiftOpen(false);
    setActiveShiftId(null);

    const latestShift = getLatestShiftForCashier(currentUser.id);

    if (latestShift) {
      setShiftTotals({
        totalSalesPAID: latestShift.totalSalesPAID ?? 0,
        cash: latestShift.totalByPaymentMode?.cash ?? 0,
        mobile_money: latestShift.totalByPaymentMode?.mobile_money ?? 0,
        other: latestShift.totalByPaymentMode?.other ?? 0,
      });
      setLatestShiftLabel(
        `${latestShift.status} • ouverture ${new Date(latestShift.openedAt).toLocaleString()}`
      );
    } else {
      setShiftTotals({
        totalSalesPAID: 0,
        cash: 0,
        mobile_money: 0,
        other: 0,
      });
      setLatestShiftLabel('Aucun shift enregistré');
    }
  };

  useEffect(() => {
    refreshShiftState();
  }, [currentUser?.id]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleRefresh = () => {
    refreshShiftState();
  };

  const updateOpeningQty = (productId: string, delta: number) => {
    setCounts((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, openingQty: clampToZero(item.openingQty + delta) }
          : item
      )
    );
  };

  const updateClosingQty = (productId: string, delta: number) => {
    setCounts((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, closingQty: clampToZero(item.closingQty + delta) }
          : item
      )
    );
  };

  const handleOpenShift = () => {
    if (!currentUser?.id) {
      Alert.alert('Erreur', 'Aucun utilisateur connecté.');
      return;
    }

    try {
      const shiftId = uuid.v4() as string;

      openShiftRecord({
        id: shiftId,
        cashierId: currentUser.id,
        items: counts.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          openingActualQty: item.openingQty,
        })),
      });

      refreshShiftState();

      Alert.alert(
        'Shift ouvert',
        'Le shift est maintenant enregistré en base avec les quantités de départ.'
      );
    } catch (error) {
      console.error('openShift failed', error);
      Alert.alert('Erreur', "Impossible d'ouvrir le shift.");
    }
  };

  const currentExpectedMap = useMemo(() => {
    const rows = getAllStockRows();
    return new Map(rows.map((row) => [row.productId, row.quantity]));
  }, [shiftTotals.totalSalesPAID, shiftTotals.cash, shiftTotals.mobile_money, shiftTotals.other]);

  const discrepancyItems = useMemo(() => {
    return counts
      .map((item) => {
        const expectedQty = Number(currentExpectedMap.get(item.productId) ?? 0);
        const actualQty = Number(item.closingQty ?? 0);
        const difference = actualQty - expectedQty;

        return {
          productId: item.productId,
          productName: item.productName,
          expectedQty,
          actualQty,
          difference,
        };
      })
      .filter((item) => item.difference !== 0);
  }, [counts, currentExpectedMap]);

  const pendingPaymentsCount = useMemo(
    () => orders.filter((item) => item.status === 'MONEY_COLLECTED').length,
    [orders]
  );

  const handleCloseShiftConfirmed = () => {
    if (!activeShiftId || !currentUser?.id) {
      Alert.alert('Erreur', 'Aucun shift ouvert.');
      return;
    }

    try {
      closeShiftRecord({
        shiftId: activeShiftId,
        cashierId: currentUser.id,
        items: counts.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          closingActualQty: item.closingQty,
        })),
      });

      setCounts((prev) =>
        prev.map((item) => ({
          ...item,
          openingQty: item.closingQty,
          closingQty: 0,
        }))
      );

      setShowDiscrepancyReview(false);
      refreshShiftState();

      Alert.alert(
        'Shift fermé',
        'Le shift a été fermé. Les écarts éventuels ont été enregistrés.'
      );
    } catch (error) {
      console.error('closeShift failed', error);
      Alert.alert('Erreur', "Impossible de fermer le shift.");
    }
  };

  const handleCloseShift = () => {
    if (!activeShiftId || !currentUser?.id) {
      Alert.alert('Erreur', 'Aucun shift ouvert.');
      return;
    }

    if (pendingPaymentsCount > 0) {
      Alert.alert(
        'Clôture impossible',
        `Il reste ${pendingPaymentsCount} vente(s) en attente de validation caisse.`
      );
      return;
    }

    if (discrepancyItems.length === 0) {
      handleCloseShiftConfirmed();
      return;
    }

    setShowDiscrepancyReview(true);
  };

  const shiftStatusLabel = isShiftOpen ? 'OPEN' : 'CLOSED';

  const openingNonZeroCount = useMemo(
    () => counts.filter((item) => item.openingQty > 0).length,
    [counts]
  );

  const closingNonZeroCount = useMemo(
    () => counts.filter((item) => item.closingQty > 0).length,
    [counts]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContentPage}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.topBar}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Shift caisse</Text>
            <Text style={styles.userText}>
              Connecté : {currentUser?.name || currentUser?.identifier || 'Caissière'}
            </Text>
            <Text style={styles.statusText}>
              Statut : <Text style={styles.statusValue}>{shiftStatusLabel}</Text>
            </Text>
            <Text style={styles.statusText}>
              Dernier shift : <Text style={styles.statusValue}>{latestShiftLabel}</Text>
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Totaux du shift</Text>
          <Text style={styles.summaryText}>
            Total ventes payées : <Text style={styles.summaryValue}>{shiftTotals.totalSalesPAID} FCFA</Text>
          </Text>
          <Text style={styles.summaryText}>
            Cash : <Text style={styles.summaryValue}>{shiftTotals.cash} FCFA</Text>
          </Text>
          <Text style={styles.summaryText}>
            Mobile money : <Text style={styles.summaryValue}>{shiftTotals.mobile_money} FCFA</Text>
          </Text>
          <Text style={styles.summaryText}>
            Other : <Text style={styles.summaryValue}>{shiftTotals.other} FCFA</Text>
          </Text>
          <Text style={styles.summaryText}>
            Ventes caisse restantes : <Text style={styles.summaryValue}>{pendingPaymentsCount}</Text>
          </Text>

          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Rafraîchir les totaux</Text>
          </Pressable>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Contrôle avant clôture</Text>
          <Text style={styles.warningText}>
            Produits avec écart détecté :{' '}
            <Text style={styles.warningValue}>{discrepancyItems.length}</Text>
          </Text>
          {pendingPaymentsCount > 0 && (
            <Text style={styles.warningText}>
              Clôture bloquée tant qu’il reste des ventes en attente.
            </Text>
          )}
          {discrepancyItems.length > 0 && (
            <Text style={styles.warningText}>
              Corrige le comptage ou accepte l’écart avant de clôturer.
            </Text>
          )}
        </View>

        <Text style={styles.description}>
          Fin de shift : la quantité de fin est comparée à la quantité attendue.
        </Text>

        <Text style={styles.helperText}>
          {!isShiftOpen
            ? `Produits non nuls au départ : ${openingNonZeroCount}/${counts.length}`
            : `Produits non nuls à la fin : ${closingNonZeroCount}/${counts.length}`}
        </Text>

        {isShiftOpen && discrepancyItems.length > 0 && (
          <View style={styles.discrepancyBox}>
            <Text style={styles.discrepancyTitle}>Écarts détectés</Text>
            {discrepancyItems.slice(0, 8).map((item) => (
              <Text key={item.productId} style={styles.discrepancyText}>
                {item.productName} — attendu {item.expectedQty}, réel {item.actualQty}, écart {item.difference}
              </Text>
            ))}
            {discrepancyItems.length > 8 && (
              <Text style={styles.discrepancyText}>
                ... et {discrepancyItems.length - 8} autre(s).
              </Text>
            )}
          </View>
        )}

        {showDiscrepancyReview && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Validation des écarts</Text>
            <Text style={styles.confirmText}>
              Si tu continues, cela signifie que tu reconnais officiellement le manquant ou le surplus.
            </Text>

            <View style={styles.confirmButtonsColumn}>
              <Pressable
                style={styles.backToCountButton}
                onPress={() => setShowDiscrepancyReview(false)}
              >
                <Text style={styles.backToCountButtonText}>Retour au comptage</Text>
              </Pressable>

              <Pressable
                style={styles.acceptDiscrepancyButton}
                onPress={handleCloseShiftConfirmed}
              >
                <Text style={styles.acceptDiscrepancyButtonText}>Accepter et clôturer</Text>
              </Pressable>
            </View>
          </View>
        )}

        {counts.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun produit disponible pour le contrôle de stock.
          </Text>
        ) : (
          counts.map((item) => (
            <View key={item.productId} style={styles.card}>
              <Text style={styles.productName}>{item.productName}</Text>

              <QtyControl
                label="Quantité de départ"
                value={item.openingQty}
                editable={!isShiftOpen}
                onMinus={() => updateOpeningQty(item.productId, -1)}
                onPlus={() => updateOpeningQty(item.productId, 1)}
              />

              <QtyControl
                label="Quantité de fin"
                value={item.closingQty}
                editable={isShiftOpen}
                onMinus={() => updateClosingQty(item.productId, -1)}
                onPlus={() => updateClosingQty(item.productId, 1)}
              />
            </View>
          ))
        )}

        {!isShiftOpen ? (
          <Pressable style={styles.primaryButton} onPress={handleOpenShift}>
            <Text style={styles.primaryButtonText}>Ouvrir le shift</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={handleCloseShift}>
            <Text style={styles.secondaryButtonText}>Fermer le shift</Text>
          </Pressable>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scroll: {
    flex: 1,
  },
  scrollContentPage: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  userText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  statusText: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  statusValue: {
    fontWeight: '800',
    color: '#111827',
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
    marginTop: 14,
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
  refreshButton: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  warningCard: {
    marginTop: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9a3412',
    marginBottom: 8,
  },
  warningText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9a3412',
  },
  warningValue: {
    fontWeight: '800',
  },
  description: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
  },
  discrepancyBox: {
    marginTop: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  discrepancyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 8,
  },
  discrepancyText: {
    marginTop: 4,
    fontSize: 14,
    color: '#991b1b',
  },
  confirmBox: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#e5e7eb',
  },
  confirmButtonsColumn: {
    marginTop: 14,
    gap: 12,
  },
  backToCountButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backToCountButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  acceptDiscrepancyButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptDiscrepancyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  qtySection: {
    marginTop: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyActionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyActionButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  qtyActionButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3730a3',
    lineHeight: 24,
  },
  qtyValueBox: {
    flex: 1,
    marginHorizontal: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    backgroundColor: '#b91c1c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
});