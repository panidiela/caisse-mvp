import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import type { CartLine, LocalSaleStatus } from '../../src/types/ui.types';

type Product = {
  id: string;
  name: string;
  price?: number;
};

type Sale = {
  id: string;
  tableId?: string | null;
  sourceLabel?: string | null;
  status: 'DRAFT' | 'SENT' | 'MONEY_COLLECTED' | 'PAID' | 'CANCELLED';
  totalAmount: number;
};

export default function ServerOrderScreen() {
  const params = useLocalSearchParams<{
    tableId?: string;
    zoneId?: string;
    sourceType?: string;
    sourceLabel?: string;
  }>();

  const currentUser = useStore((s) => s.currentUser);
  const products = useStore((s) => (s.products ?? []) as Product[]);
  const orders = useStore((s) => (s.orders ?? []) as Sale[]);
  const createSale = useStore((s) => s.createSale);
  const updateSaleStatus = useStore((s) => s.updateSaleStatus);

  const [items, setItems] = useState<CartLine[]>([]);
  const [status, setStatus] = useState<LocalSaleStatus>('DRAFT');
  const [savedSaleId, setSavedSaleId] = useState<string | null>(null);

  const sourceLabel =
    typeof params.sourceLabel === 'string' && params.sourceLabel.length > 0
      ? params.sourceLabel
      : 'Commande';

  const existingActiveSale = useMemo(() => {
    if (!params.tableId || typeof params.tableId !== 'string') return null;

    return (
      orders.find(
        (sale) =>
          sale.tableId === params.tableId &&
          sale.status !== 'PAID' &&
          sale.status !== 'CANCELLED'
      ) ?? null
    );
  }, [orders, params.tableId]);

  const addToCart = (product: Product) => {
    if (savedSaleId) {
      Alert.alert(
        'Commande verrouillée',
        'Cette commande a déjà été enregistrée. Réinitialise pour repartir sur une nouvelle commande.'
      );
      return;
    }

    if (existingActiveSale && !savedSaleId) {
      Alert.alert(
        'Commande déjà en cours',
        'Cette table a déjà une commande active. Pour l’instant, évite de recréer une nouvelle commande sur la même table.'
      );
      return;
    }

    setItems((prev) => {
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

  const decreaseQty = (productId: string) => {
    if (savedSaleId) {
      Alert.alert(
        'Commande verrouillée',
        'Cette commande a déjà été enregistrée. Réinitialise pour repartir sur une nouvelle commande.'
      );
      return;
    }

    setItems((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: item.qty - 1 } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  const canSend =
    items.length > 0 &&
    status === 'DRAFT' &&
    !savedSaleId &&
    !existingActiveSale;

  const canMarkMoneyCollected = savedSaleId !== null && status === 'SENT';

  const handleShowToCustomer = () => {
    if (!canSend || !currentUser) return;

    const saleId = createSale({
      tableId:
        typeof params.tableId === 'string' && params.tableId.length > 0
          ? params.tableId
          : null,
      zoneId:
        typeof params.zoneId === 'string' && params.zoneId.length > 0
          ? params.zoneId
          : null,
      sourceType:
        (typeof params.sourceType === 'string' && params.sourceType) || 'free',
      sourceLabel,
      serverId: currentUser.id,
      shiftId: null,
      status: 'SENT',
      items: items.map((item) => ({
        productId: item.productId || item.id,
        productName: item.name,
        unitPrice: item.price,
        quantity: item.qty,
        total: item.qty * item.price,
      })),
    });

    if (!saleId) {
      Alert.alert('Erreur', "Impossible d'enregistrer la vente.");
      return;
    }

    setSavedSaleId(saleId);
    setStatus('SENT');

    Alert.alert(
      'Commande enregistrée',
      'La commande a été enregistrée et montrée au client.'
    );
  };

  const handleMoneyCollected = () => {
    if (!canMarkMoneyCollected || !savedSaleId) return;

    try {
      updateSaleStatus(savedSaleId, 'MONEY_COLLECTED');
      setStatus('MONEY_COLLECTED');

      Alert.alert(
        'Argent reçu',
        "La vente est maintenant en attente de validation par la caissière."
      );
    } catch (error) {
      console.error('handleMoneyCollected failed', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le statut de la vente.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleReset = () => {
    setItems([]);
    setStatus('DRAFT');
    setSavedSaleId(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>{sourceLabel}</Text>
        <Text style={styles.subtitle}>
          État actuel : <Text style={styles.statusValue}>{status}</Text>
        </Text>

        {existingActiveSale && !savedSaleId && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Commande déjà en cours</Text>
            <Text style={styles.warningText}>
              Cette table a déjà une commande active.
            </Text>
            <Text style={styles.warningText}>
              Statut : <Text style={styles.warningValue}>{existingActiveSale.status}</Text>
            </Text>
            <Text style={styles.warningText}>
              Total : <Text style={styles.warningValue}>{existingActiveSale.totalAmount} FCFA</Text>
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Produits</Text>

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          horizontal
          contentContainerStyle={styles.productsList}
          renderItem={({ item }) => (
            <Pressable style={styles.productCard} onPress={() => addToCart(item)}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>{item.price ?? 0} FCFA</Text>
            </Pressable>
          )}
        />

        <Text style={styles.sectionTitle}>Commande</Text>

        {items.length === 0 ? (
          <Text style={styles.emptyText}>Aucun produit ajouté.</Text>
        ) : (
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.qty} × {item.price} FCFA
                  </Text>
                </View>

                <View style={styles.itemActions}>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => decreaseQty(item.id)}
                  >
                    <Text style={styles.qtyButtonText}>−</Text>
                  </Pressable>

                  <Text style={styles.itemTotal}>{item.qty * item.price} FCFA</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total} FCFA</Text>
        </View>

        <Pressable
          style={[styles.primaryButton, !canSend && styles.buttonDisabled]}
          onPress={handleShowToCustomer}
          disabled={!canSend}
        >
          <Text style={styles.primaryButtonText}>Afficher au client</Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            !canMarkMoneyCollected && styles.buttonDisabled,
          ]}
          onPress={handleMoneyCollected}
          disabled={!canMarkMoneyCollected}
        >
          <Text style={styles.secondaryButtonText}>Argent reçu</Text>
        </Pressable>

        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Réinitialiser cette commande</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730a3',
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#6b7280',
  },
  statusValue: {
    fontWeight: '800',
    color: '#111827',
  },
  warningCard: {
    marginTop: 16,
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
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  productsList: {
    gap: 10,
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
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemsContainer: {
    gap: 10,
  },
  itemRow: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  itemActions: {
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
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3730a3',
    fontSize: 15,
    fontWeight: '700',
  },
  resetButton: {
    marginTop: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});