import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
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

type Product = {
  id: string;
  name: string;
  price?: number;
};

type CartLine = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  qty: number;
};

type SaleItem = {
  id: string;
  productName?: string;
  quantity?: number;
  total?: number;
};

type Sale = {
  id: string;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  sourceLabel?: string | null;
  totalAmount: number;
  items?: SaleItem[];
  createdAt?: string;
};

export default function CaisseScreen() {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const products = useStore((s) => (s.products ?? []) as Product[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);
  const createSale = useStore((s) => s.createSale);
  const paySale = useStore((s) => s.paySale);
  const hydrateSalesFromDb = useStore((s) => s.hydrateSalesFromDb);

  const [counterCart, setCounterCart] = useState<CartLine[]>([]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleOpenShift = () => {
    router.push('/(cashier)/shift');
  };

  const handleRefresh = () => {
    if (typeof hydrateSalesFromDb === 'function') {
      hydrateSalesFromDb();
    }
  };

  const pendingSales = useMemo(
    () => orders.filter((sale) => sale.status === 'MONEY_COLLECTED'),
    [orders]
  );

  const paidSalesCount = useMemo(
    () => orders.filter((sale) => sale.status === 'PAID').length,
    [orders]
  );

  const addToCounterCart = (product: Product) => {
    setCounterCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);

      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, qty: p.qty + 1 } : p
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price ?? 0,
          qty: 1,
        },
      ];
    });
  };

  const decreaseCounterQty = (productId: string) => {
    setCounterCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const counterTotal = useMemo(
    () => counterCart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [counterCart]
  );

  const handleValidatePendingPayment = (sale: Sale) => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Aucun utilisateur connecté.');
      return;
    }

    try {
      paySale({
        saleId: sale.id,
        method: 'cash',
        amount: sale.totalAmount,
        paidByUserId: currentUser.id,
      });

      Alert.alert(
        'Paiement validé',
        'La vente est maintenant marquée comme PAID et rattachée au shift ouvert.'
      );
    } catch (error: any) {
      Alert.alert(
        'Paiement impossible',
        error?.message || 'Impossible de valider ce paiement.'
      );
    }
  };

  const handleValidateCounterSale = () => {
    if (!currentUser) {
      Alert.alert('Erreur', 'Aucun utilisateur connecté.');
      return;
    }

    if (counterCart.length === 0) {
      Alert.alert('Panier vide', 'Ajoute au moins un produit.');
      return;
    }

    try {
      const saleId = createSale({
        tableId: null,
        zoneId: null,
        sourceType: 'counter',
        sourceLabel: 'Comptoir',
        serverId: currentUser.id,
        shiftId: null,
        status: 'MONEY_COLLECTED',
        items: counterCart.map((item) => ({
          id: uuid.v4() as string,
          productId: item.productId || item.id,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.qty,
          total: item.qty * item.price,
        })),
      });

      if (!saleId) {
        Alert.alert('Erreur', "Impossible d'enregistrer la vente comptoir.");
        return;
      }

      paySale({
        saleId,
        method: 'cash',
        amount: counterTotal,
        paidByUserId: currentUser.id,
      });

      setCounterCart([]);

      Alert.alert(
        'Vente comptoir validée',
        'La vente a été enregistrée puis validée en PAID.'
      );
    } catch (error: any) {
      Alert.alert(
        'Paiement impossible',
        error?.message || "Impossible de finaliser la vente comptoir."
      );
    }
  };

  const renderPendingSaleCard = ({ item }: { item: Sale }) => (
    <View style={styles.saleCard}>
      <Text style={styles.saleTitle}>{item.sourceLabel || 'Vente'}</Text>
      <Text style={styles.saleMeta}>Statut : {item.status}</Text>
      <Text style={styles.saleMeta}>Montant : {item.totalAmount} FCFA</Text>
      <Text style={styles.saleMeta}>
        Articles : {Array.isArray(item.items) ? item.items.length : 0}
      </Text>

      <Pressable
        style={styles.validateButton}
        onPress={() => handleValidatePendingPayment(item)}
      >
        <Text style={styles.validateButtonText}>Valider paiement</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Caisse</Text>
            <Text style={styles.userText}>
              Connecté : {currentUser?.name || currentUser?.identifier || 'Caissière'}
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.shiftButton} onPress={handleOpenShift}>
            <Text style={styles.shiftButtonText}>Ouvrir le shift</Text>
          </Pressable>

          <Pressable style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Rafraîchir</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé caisse</Text>
          <Text style={styles.summaryText}>
            Ventes en attente : <Text style={styles.summaryValue}>{pendingSales.length}</Text>
          </Text>
          <Text style={styles.summaryText}>
            Ventes payées : <Text style={styles.summaryValue}>{paidSalesCount}</Text>
          </Text>
        </View>

        <Text style={styles.section}>Vente comptoir directe</Text>

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          horizontal
          scrollEnabled={false}
          contentContainerStyle={styles.productsList}
          renderItem={({ item }) => (
            <Pressable style={styles.productCard} onPress={() => addToCounterCart(item)}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>{item.price ?? 0} FCFA</Text>
            </Pressable>
          )}
        />

        {counterCart.length === 0 ? (
          <Text style={styles.emptyText}>Aucun produit sélectionné pour le comptoir.</Text>
        ) : (
          <View style={styles.counterCartBox}>
            {counterCart.map((item) => (
              <View key={item.id} style={styles.counterCartRow}>
                <View style={styles.counterCartInfo}>
                  <Text style={styles.counterCartName}>{item.name}</Text>
                  <Text style={styles.counterCartMeta}>
                    {item.qty} × {item.price} FCFA
                  </Text>
                </View>

                <View style={styles.counterCartActions}>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => decreaseCounterQty(item.id)}
                  >
                    <Text style={styles.qtyButtonText}>−</Text>
                  </Pressable>
                  <Text style={styles.counterCartTotal}>
                    {item.qty * item.price} FCFA
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total comptoir</Text>
              <Text style={styles.totalValue}>{counterTotal} FCFA</Text>
            </View>

            <Pressable
              style={styles.primaryCounterButton}
              onPress={handleValidateCounterSale}
            >
              <Text style={styles.primaryCounterButtonText}>
                Valider la vente comptoir
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.section}>Factures en attente</Text>

        <FlatList
          data={pendingSales}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          renderItem={renderPendingSaleCard}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Aucune vente en attente de validation.
            </Text>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  shiftButton: {
    flex: 1,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shiftButtonText: {
    color: '#3730a3',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  refreshButtonText: {
    color: '#111827',
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
  section: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  productsList: {
    gap: 10,
    paddingTop: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 120,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  productPrice: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
  },
  counterCartBox: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  counterCartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterCartInfo: {
    flex: 1,
    marginRight: 12,
  },
  counterCartName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  counterCartMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  counterCartActions: {
    alignItems: 'flex-end',
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3730a3',
  },
  counterCartTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  primaryCounterButton: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryCounterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 12,
    gap: 12,
  },
  saleCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  saleMeta: {
    marginTop: 6,
    fontSize: 14,
    color: '#4b5563',
  },
  validateButton: {
    marginTop: 14,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 12,
    color: '#6b7280',
  },
});