import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { colors, radius, typography } from '../theme/colors';

// Scans a barcode, looks it up via the backend (/items/lookup-barcode), then
// jumps back to AddItemScreen with whatever fields were found pre-filled.
// If nothing is found the person can just fill the item in by hand as usual.
export default function BarcodeScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);

  const onScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLooking(true);
    try {
      const { data: result } = await api.get('/items/lookup-barcode', { params: { code: data } });
      if (!result.found) {
        Alert.alert('No match found', `Barcode ${data} isn't in the product database. You can fill the item in manually.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      navigation.navigate({
        name: 'AddItem',
        params: { barcodeResult: result },
        merge: true,
      });
    } catch (err) {
      Alert.alert('Lookup failed', err.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLooking(false);
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="barcode-outline" size={40} color={colors.textFaint} />
        <Text style={[typography.body, { marginTop: 12, marginBottom: 16, textAlign: 'center' }]}>
          Camera access is needed to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={scanned ? undefined : onScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>Align the barcode within the frame</Text>
      </View>
      {looking && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={[typography.body, { color: '#fff', marginTop: 12 }]}>Looking it up…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  permBtn: { backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.pill },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 160, borderWidth: 3, borderColor: '#fff', borderRadius: radius.md, opacity: 0.9 },
  hint: { color: '#fff', marginTop: 16, fontSize: 14, fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
});
