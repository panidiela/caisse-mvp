import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice } from '../../src/utils/format';
import { canAccessServer } from '../../src/utils/access';
import { SaleItem, SaleSourceType } from '../../src/types';

export default function OrderScreen() {
  const { orderId, tableId, zoneId, sourceType } = useLocalSearchParams<{
    orderId: string;
    tableId: string;
    zoneId: string;
    sourceType: SaleSourceType;
  }>();

  const router = useRouter();

  const {
    orders,
    tables,
    zones,
    currentUser,
    updateItemQuantity,
    removeItem,
    setOrderStatus,
    establishment,
  } = useStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }

    if (!canAccessServer(currentUser)) {
      Alert.alert('Accès refusé', 'Cet écran est réservé au service.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [currentUser, router]);

  const order = useMemo(
    () => orders.find((o) => o.id === orderId),
    [orders, orderId]
  );

  const table = useMemo(
    () => tables.find((t) => t.id === tableId),
    [tables, tableId]
  );

  const zone = useMemo(
    () => zones.find((z) => z.id === zoneId),
    [zones, zoneId]
  );

  if (!currentUser || !canAccessServer(currentUser) || !order) {
    return null;
  }

  const actualSourceType = order.sourceType || sourceType || 'free';

  const isOpen = order.status === 'open';
  const isWaitingPayment = order.status === 'waiting_payment';
  const isPaid = order.status === 'paid';
  const isCancelled = order.status === 'cancelled';
  const isLocked = isWaitingPayment || isPaid || isCancelled;

  const getContextTitle = () => {
    if (actualSourceType === 'counter') return 'Comptoir';
    if (actualSourceType === 'zone') return zone?.name || 'Zone';
    if (actualSourceType === 'table') return table?.name || 'Table';
    return 'Facture libre';
  };

  const getContextSubtitle = () => {
    if (actualSourceType === 'counter') return 'Vente directe au comptoir';
    if (actualSourceType === 'zone') return `Zone : ${zone?.name || 'Zone'}`;
    if (actualSourceType === 'table') {
      if (zone?.name) return `${table?.name || 'Table'} • ${zone.name}`;
      return table?.name || 'Table';
    }
    if (establishment?.configuration.hasCounter) return 'Vente libre sans table';
    return 'Facture libre';
  };

  const getSourceBadge = () => {
    if (actualSourceType === 'counter') return 'Comptoir';
    if (actualSourceType === 'zone') return 'Zone';
    if (actualSourceType === 'table') return 'Table';
    return 'Libre';
  };

  const handleAddProducts = () => {
    if (!isOpen) {
      Alert.alert(
        'Modification impossible',
        'On ne peut ajouter des produits que sur une vente en cours.'
      );
      return;
    }

    router.push({
      pathname: '/(server)/products',
      params: { orderId },
    });
  };

  const handleScanBarcode = () => {
    if (!isOpen) {
      Alert.alert(
        'Modification impossible',
        'On ne peut scanner des produits que sur une vente en cours.'
      );
      return;
    }

    router.push({
      pathname: '/(server)/scan',
      params: { orderId },
    });
  };

  const handleRequestPayment = () => {
    if (!isOpen) return;

    if (order.items.length === 0) {
      Alert.alert(
        'Vente vide',
        'Ajoute au moins un produit avant de demander le paiement.'
      );
      return;
    }

    Alert.alert(
      'Demander le paiement ?',
      'La caisse verra cette vente comme prête à être encaissée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => setOrderStatus(order.id, 'waiting_payment'),
        },
      ]
    );
  };

  const handleReopen = () => {
    if (!isWaitingPayment) return;

    Alert.alert(
      'Réouvrir la vente ?',
      'Cela remet la vente en cours pour pouvoir la modifier.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => setOrderStatus(order.id, 'open'),
        },
      ]
    );
  };

  const handleDecrease = (item: SaleItem) => {
    if (!isOpen) {
      Alert.alert(
        'Modification impossible',
        'Les quantités ne peuvent être modifiées que tant que la vente est en cours.'
      );
      return;
    }

    updateItemQuantity(order.id, item.id, item.quantity - 1);
  };

  const handleIncrease = (item: SaleItem) => {
    if (!isOpen) {
      Alert.alert(
        'Modification impossible',
        'Les quantités ne peuvent être modifiées que tant que la vente est en cours.'
      );
      return;
    }

    updateItemQuantity(order.id, item.id, item.quantity + 1);
  };

  const handleRemove = (item: SaleItem) => {
    if (!isOpen) {
      Alert.alert(
        'Suppression impossible',
        'Les produits ne peuvent être supprimés que tant que la vente est en cours.'
      );
      return;
    }

    Alert.alert('Supprimer ce produit ?', item.productNameSnapshot, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => removeItem(order.id, item.id),
      },
    ]);
  };

  const renderStatusBanner = () => {
    if (isOpen) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.primary }]}>
          <Text style={s.statusTitle}>En cours</Text>
          <Text style={s.statusText}>
            La vente est encore modifiable. Ajoute les produits puis demande le paiement.
          </Text>
        </View>
      );
    }

    if (isWaitingPayment) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.warning }]}>
          <Text style={s.statusTitle}>Paiement demandé</Text>
          <Text style={s.statusText}>
            La vente est prête. La caisse doit maintenant l’encaisser.
          </Text>
        </View>
      );
    }

    if (isPaid) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.success }]}>
          <Text style={s.statusTitle}>Payée</Text>
          <Text style={s.statusText}>
            La caisse a validé officiellement le paiement.
          </Text>
        </View>
      );
    }

    return (
      <View style={[s.statusBanner, { backgroundColor: COLORS.textLight }]}>
        <Text style={s.statusTitle}>Annulée</Text>
        <Text style={s.statusText}>Cette vente a été annulée.</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SaleItem }) => (
    <View style={s.item}>
      <View style={s.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.itemName}>{item.productNameSnapshot}</Text>
          <Text style={s.itemPrice}>
            {formatPrice(item.unitPriceSnapshot)} × {item.quantity}
          </Text>
        </View>

        <Text style={s.itemTotal}>{formatPrice(item.lineTotal)}</Text>
      </View>

      {!isLocked && (
        <View style={s.itemActions}>
          <View style={s.qtyControls}>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => handleDecrease(item)}
            >
              <Text style={s.qtyBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={s.qty}>{item.quantity}</Text>

            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => handleIncrease(item)}
            >
              <Text style={s.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => handleRemove(item)}>
            <Text style={s.removeText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Screen title={getContextTitle()}>
      <FlatList
        data={order.items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: 16, gap: 14 }}>
            <View style={s.referenceCard}>
              <Text style={s.referenceLabel}>Référence</Text>
              <Text style={s.referenceValue}>
                Vente #{order.id.slice(0, 8).toUpperCase()}
              </Text>

              <View style={s.contextRow}>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{getSourceBadge()}</Text>
                </View>

                <Text style={s.contextSubtitle}>{getContextSubtitle()}</Text>
              </View>
            </View>

            {renderStatusBanner()}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucun article</Text>
            <Text style={s.emptySubtext}>Ajoute des produits à la vente</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 180, flexGrow: 1 }}
      />

      <View style={s.footer}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
        </View>

        {isOpen && (
          <View style={s.actions}>
            <TouchableOpacity style={s.bigActionBtn} onPress={handleAddProducts}>
              <Text style={s.bigActionBtnText}>Produits</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.bigActionBtn} onPress={handleScanBarcode}>
              <Text style={s.bigActionBtnText}>Scanner</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOpen && order.items.length > 0 && (
          <TouchableOpacity style={s.primaryBox} onPress={handleRequestPayment}>
            <Text style={s.primaryBoxText}>Demander paiement</Text>
          </TouchableOpacity>
        )}

        {isWaitingPayment && (
          <TouchableOpacity style={s.secondaryBox} onPress={handleReopen}>
            <Text style={s.secondaryBoxText}>Réouvrir la vente</Text>
          </TouchableOpacity>
        )}

        {isPaid && (
          <View style={s.successBox}>
            <Text style={s.successBoxText}>Paiement confirmé</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  referenceCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    ...SHADOW.sm,
  },
  referenceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  referenceValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  contextRow: {
    marginTop: 10,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  contextSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  statusBanner: {
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.sm,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    ...SHADOW.sm,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemPrice: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    minWidth: 90,
    textAlign: 'right',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  qty: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  removeText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 6,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  bigActionBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  bigActionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  primaryBox: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBoxText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryBox: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBoxText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 15,
  },
  successBox: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successBoxText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});