// app/(server)/scan.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { COLORS, RADIUS } from '../../src/constants/theme';
import * as DB from '../../src/db/database';

export default function ScanScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { addItemToOrder } = useStore();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const product = DB.getProductByBarcode(data);
    if (product) {
      addItemToOrder(orderId, product);
      Alert.alert('Produit ajouté', `${product.name}\n${product.price} FCFA`, [
        { text: 'Scanner encore', onPress: () => setScanned(false) },
        { text: 'Terminé', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Produit non trouvé', `Code: ${data}`, [
        { text: 'Réessayer', onPress: () => setScanned(false) },
        { text: 'Annuler', onPress: () => router.back() },
      ]);
    }
  };

  if (!permission) return <View style={s.center}><Text>Chargement...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>Accès caméra requis</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Autoriser</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: COLORS.textLight }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={s.overlay}>
          <Text style={s.title}>Scanner un code-barres</Text>
          <View style={s.target} />
          {scanned && <Text style={s.scanning}>Traitement...</Text>}
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
            <Text style={s.cancelText}>✕ Annuler</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, gap: 16 },
  permText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  permBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, paddingHorizontal: 28 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: 40 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8 },
  target: {
    width: 250, height: 150,
    borderWidth: 3, borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent',
  },
  scanning: { color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  cancelBtn: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.xl, paddingHorizontal: 28, paddingVertical: 14 },
  cancelText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
