import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../../src/constants/theme';
import { formatPrice } from '../../../src/utils/format';

export default function ProductsScreen() {
  const { products, addProduct, removeProduct } = useStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [barcode, setBarcode] = useState('');

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const handleAdd = () => {
    const parsedPrice = Number(price);

    const result = addProduct({
      name,
      price: parsedPrice,
      categoryNameSnapshot: categoryName.trim() || null,
      barcode: barcode.trim() || null,
      isBarcodeBased: barcode.trim().length > 0,
    });

    if (!result.ok) {
      Alert.alert('Erreur', result.error || 'Impossible d’ajouter ce produit.');
      return;
    }

    setName('');
    setPrice('');
    setCategoryName('');
    setBarcode('');

    Alert.alert('Succès', 'Produit ajouté.');
  };

  const handleDelete = (productId: string, productName: string) => {
    Alert.alert(
      'Supprimer ce produit ?',
      productName,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeProduct(productId),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🍾 Produits</Text>
        <Text style={s.subtitle}>
          Ajoute, consulte et supprime les produits disponibles à la vente.
        </Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Produits existants</Text>

          {sortedProducts.length === 0 ? (
            <Text style={s.empty}>Aucun produit configuré.</Text>
          ) : (
            sortedProducts.map((product) => (
              <View key={product.id} style={s.productCard}>
                <View style={s.productTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{product.name}</Text>

                    {product.categoryNameSnapshot ? (
                      <Text style={s.productMeta}>
                        Catégorie : {product.categoryNameSnapshot}
                      </Text>
                    ) : null}

                    {product.barcode ? (
                      <Text style={s.productMeta}>Code-barres : {product.barcode}</Text>
                    ) : null}
                  </View>

                  <Text style={s.productPrice}>{formatPrice(product.price)}</Text>
                </View>

                <View style={s.productActions}>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(product.id, product.name)}
                  >
                    <Text style={s.deleteBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ajouter un produit</Text>

          <View style={s.field}>
            <Text style={s.label}>Nom du produit</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Bière 65cl"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Prix</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Ex: 1500"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Catégorie (optionnel)</Text>
            <TextInput
              style={s.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Ex: Boissons"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Code-barres (optionnel)</Text>
            <TextInput
              style={s.input}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Ex: 1234567890123"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
            />
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={handleAdd}>
            <Text style={s.primaryBtnText}>Ajouter le produit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.sm,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  empty: {
    color: COLORS.textLight,
    fontSize: 14,
  },

  productCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  productMeta: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textLight,
  },

  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    minWidth: 90,
    textAlign: 'right',
  },

  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  deleteBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  deleteBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },

  field: {
    gap: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },

  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});