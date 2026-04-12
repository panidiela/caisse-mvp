import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { Button } from '../../src/components/ui/Button';
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
    markOrderAsSent,
    markMoneyCollected,
    establishment,
  } = useStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
      return;
    }

    if (!canAccessServer(currentUser)) {
      Alert.alert('Accès refusé', 'Cet écran est réservé au service en salle.', [
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

  if (!currentUser || !canAccessServer(currentUser) || !order) return null;

  const actualSourceType = order.sourceType || sourceType || 'free';

  const isDraft = order.status === 'draft';
  const isSent = order.status === 'sent';
  const isMoneyCollected = order.status === 'money_collected';
  const isPaid = order.status === 'paid';
  const isLocked = isMoneyCollected || isPaid;

  const getContextTitle = () => {
    if (actualSourceType === 'counter') return 'Comptoir';
    if (actualSourceType === 'zone') return zone?.name || 'Zone';
    if (actualSourceType === 'table') return table?.name || 'Table';
    return 'Facture libre';
  };

  const getContextSubtitle = () => {
    if (actualSourceType === 'counter') {
      return 'Vente directe au comptoir';
    }

    if (actualSourceType === 'zone') {
      return `Zone : ${zone?.name || 'Zone'}`;
    }

    if (actualSourceType === 'table') {
      if (zone?.name) {
        return `${table?.name || 'Table'} • ${zone.name}`;
      }
      return table?.name || 'Table';
    }

    if (establishment?.configuration.hasCounter) {
      return 'Vente libre sans table';
    }

    return 'Facture libre';
  };

  const getSourceBadge = () => {
    if (actualSourceType === 'counter') return '🧾 Comptoir';
    if (actualSourceType === 'zone') return '📍 Zone';
    if (actualSourceType === 'table') return '🪑 Table';
    return '📄 Libre';
  };

  const handleAddProducts = () => {
    if (!isDraft) {
      Alert.alert(
        'Modification impossible',
        'On ne peut ajouter des produits que sur une facture en brouillon.'
      );
      return;
    }

    router.push({
      pathname: '/(server)/products',
      params: { orderId },
    });
  };

  const handleScanBarcode = () => {
    if (!isDraft) {
      Alert.alert(
        'Modification impossible',
        'On ne peut scanner des produits que sur une facture en brouillon.'
      );
      return;
    }

    router.push({
      pathname: '/(server)/scan',
      params: { orderId },
    });
  };

  const handleSendBill = () => {
    if (!isDraft) return;

    if (order.items.length === 0) {
      Alert.alert('Facture vide', 'Ajoute au moins un produit avant d’envoyer la facture.');
      return;
    }

    Alert.alert(
      'Envoyer la facture ?',
      'La facture sera marquée comme envoyée au client.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            markOrderAsSent(order.id);
          },
        },
      ]
    );
  };

  const handleMarkMoneyCollected = () => {
    if (!isSent) return;

    Alert.alert(
      'Argent reçu ?',
      'Cette action signale à la caisse que le client a remis l’argent.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            markMoneyCollected(order.id, currentUser.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleDecrease = (item: SaleItem) => {
    if (!isDraft) {
      Alert.alert(
        'Modification impossible',
        'Les quantités ne peuvent être modifiées qu’en brouillon.'
      );
      return;
    }

    updateItemQuantity(order.id, item.id, item.quantity - 1);
  };

  const handleIncrease = (item: SaleItem) => {
    if (!isDraft) {
      Alert.alert(
        'Modification impossible',
        'Les quantités ne peuvent être modifiées qu’en brouillon.'
      );
      return;
    }

    updateItemQuantity(order.id, item.id, item.quantity + 1);
  };

  const handleRemove = (item: SaleItem) => {
    if (!isDraft) {
      Alert.alert(
        'Suppression impossible',
        'Les produits ne peuvent être supprimés qu’en brouillon.'
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
    if (isDraft) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.occupied }]}>
          <Text style={s.statusTitle}>📝 Brouillon</Text>
          <Text style={s.statusText}>
            La commande est encore modifiable. Ajoute les produits puis envoie la facture.
          </Text>
        </View>
      );
    }

    if (isSent) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.warning }]}>
          <Text style={s.statusTitle}>⏳ Facture envoyée</Text>
          <Text style={s.statusText}>
            Le client a vu la facture. Dès que tu reçois l’argent, clique sur “Argent reçu”.
          </Text>
        </View>
      );
    }

    if (isMoneyCollected) {
      return (
        <View style={[s.statusBanner, { backgroundColor: COLORS.primary }]}>
          <Text style={s.statusTitle}>💵 Argent reçu</Text>
          <Text style={s.statusText}>
            La caisse doit maintenant valider officiellement le paiement.
          </Text>
        </View>
      );
    }

    return (
      <View style={[s.statusBanner, { backgroundColor: COLORS.success }]}>
        <Text style={s.statusTitle}>✅ Payée</Text>
        <Text style={s.statusText}>
          La caisse a validé officiellement le paiement.
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SaleItem }) => (
    <View style={s.item}>
      <View style={s.itemTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.itemName} numberOfLines={1}>
            {item.productNameSnapshot}
          </Text>
          <Text style={s.itemPrice}>
            {formatPrice(item.unitPriceSnapshot)} × {item.quantity}
          </Text>
        </View>

        <Text style={s.itemTotal}>{formatPrice(item.lineTotal)}</Text>
      </View>

      {!isLocked && (
        <View style={s.itemActions}>
          <View style={s.qtyControls}>
            <TouchableOpacity style={s.qtyBtn} onPress={() => handleDecrease(item)}>
              <Text style={s.qtyBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={s.qty}>{item.quantity}</Text>

            <TouchableOpacity style={s.qtyBtn} onPress={() => handleIncrease(item)}>
              <Text style={s.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {isDraft && (
            <TouchableOpacity onPress={() => handleRemove(item)}>
              <Text style={s.removeText}>Supprimer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <Screen title={getContextTitle()} back>
      <FlatList
        data={order.items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: 16, gap: 12 }}>
            <View style={s.referenceCard}>
              <Text style={s.referenceLabel}>Référence</Text>
              <Text style={s.referenceValue}>{order.reference}</Text>

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
            <Text style={s.emptySubtext}>Ajoute des produits à la facture</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140, flexGrow: 1 }}
      />

      <View style={s.footer}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalAmount}>{formatPrice(order.total)}</Text>
        </View>

        {isDraft && (
          <>
            <View style={s.actions}>
              <Button
                label="📷 Scanner"
                onPress={handleScanBarcode}
                variant="outline"
                style={s.actionBtn}
              />
              <Button
                label="+ Produits"
                onPress={handleAddProducts}
                variant="primary"
                style={s.actionBtn}
              />
            </View>

            {order.items.length > 0 && (
              <Button
                label="Envoyer la facture"
                onPress={handleSendBill}
                variant="secondary"
                style={{ marginTop: 8 }}
              />
            )}
          </>
        )}

        {isSent && (
          <Button
            label="💵 Argent reçu"
            onPress={handleMarkMoneyCollected}
            variant="success"
          />
        )}

        {isMoneyCollected && (
          <View style={s.badgeBox}>
            <Text style={s.badgeBoxText}>Attente validation caisse</Text>
          </View>
        )}

        {isPaid && (
          <View style={[s.badgeBox, { backgroundColor: COLORS.success }]}>
            <Text style={s.badgeBoxText}>Paiement confirmé</Text>
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

  actionBtn: {
    flex: 1,
  },

  badgeBox: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },

  badgeBoxText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});