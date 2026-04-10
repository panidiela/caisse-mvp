// app/(server)/products.tsx

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS, SHADOW } from '../../src/constants/theme';
import { formatPrice } from '../../src/utils/format';
import { Product } from '../../src/types';

export default function ProductsScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { products, addItemToOrder, orders } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const order = orders.find((o) => o.id === orderId);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = !selectedCategory || p.category === selectedCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const getQtyInOrder = (productId: string) => {
    if (!order) return 0;
    return order.items.find((i) => i.productId === productId)?.quantity ?? 0;
  };

  const handleAdd = (product: Product) => {
    addItemToOrder(orderId, product);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const qty = getQtyInOrder(item.id);
    return (
      <TouchableOpacity style={s.card} onPress={() => handleAdd(item)} activeOpacity={0.8}>
        <View style={s.cardLeft}>
          <Text style={s.productName}>{item.name}</Text>
          <Text style={s.category}>{item.category}</Text>
        </View>
        <View style={s.cardRight}>
          <Text style={s.price}>{formatPrice(item.price)}</Text>
          {qty > 0 && <View style={s.badge}><Text style={s.badgeText}>×{qty}</Text></View>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen title="Ajouter des produits" back>
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher un produit..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={s.categories}>
        <TouchableOpacity
          style={[s.catChip, !selectedCategory && s.catChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[s.catText, !selectedCategory && s.catTextActive]}>Tous</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.catChip, selectedCategory === cat && s.catChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text style={[s.catText, selectedCategory === cat && s.catTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={s.empty}>Aucun produit trouvé</Text>}
      />
      <View style={s.footer}>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
          <Text style={s.doneBtnText}>✓ Terminé ({order?.items.reduce((s, i) => s + i.quantity, 0) ?? 0} articles)</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  searchBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  catTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.sm,
  },
  cardLeft: { flex: 1, gap: 3 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  productName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  category: { fontSize: 12, color: COLORS.textLight },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: COLORS.textLight, padding: 40 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
