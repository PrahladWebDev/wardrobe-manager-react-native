import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// Scans a product barcode (EAN/UPC), looks it up on the backend, and hands
// the match back to AddItem via route params so name/brand/price prefill.
// If nothing is found the person can just fill the item in by hand as usual.
export default function BarcodeScanScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);
  // A ref, not state: the camera fires several frames before a re-render
  // commits, which used to trigger duplicate lookups and navigations.
  const scannedRef = useRef(false);

  const reset = () => { scannedRef.current = false; setScanned(false); };

  const onScanned = async ({ data }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    setLooking(true);
    haptic.light();
    try {
      const { data: result } = await api.get('/items/lookup-barcode', { params: { code: data } });
      if (!result.found) {
        haptic.warning();
        Alert.alert('No match found', `Barcode ${data} isn't in the product database. You can fill the item in manually.`, [
          { text: 'Scan again', onPress: reset },
          { text: 'Fill in manually', onPress: () => navigation.goBack() },
        ], { cancelable: false });
        return;
      }
      haptic.success();
      navigation.navigate({ name: 'AddItem', params: { barcodeResult: result }, merge: true });
    } catch (err) {
      haptic.error();
      Alert.alert('Lookup failed', err.message, [
        { text: 'Try again', onPress: reset },
        { text: 'Close', onPress: () => navigation.goBack() },
      ], { cancelable: false });
    } finally {
      setLooking(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <EmptyState
          icon="barcode-outline"
          title="Camera access needed"
          subtitle="FoldD only uses the camera while you scan a barcode."
          action={{ label: 'Allow camera', onPress: requestPermission }}
        />
        {!permission.canAskAgain && (
          <Text style={[theme.typography.caption, { textAlign: 'center', paddingHorizontal: 30 }]}>Camera was denied earlier. Enable it in your phone's Settings for FoldD.</Text>
        )}
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
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />
        </View>
        <Text style={styles.hint}>Align the barcode within the frame</Text>
      </View>
      {looking && (
        <View style={styles.looking}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.lookingText}>Looking it up…</Text>
        </View>
      )}
      <View style={styles.bottomBar}>
        <Button title="Enter details manually" variant="outline" onPress={() => navigation.goBack()} textStyle={{ color: '#FFFFFF' }} style={{ borderColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.35)' }} />
      </View>
    </View>
  );
}

// Whites here are intentional: they sit on top of the live camera feed, not a themed surface.
const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 160 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  hint: { color: '#FFFFFF', marginTop: 18, fontSize: 14, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  looking: {
    position: 'absolute', top: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.pill,
  },
  lookingText: { color: '#FFFFFF', marginLeft: 10, fontWeight: '600' },
  bottomBar: { position: 'absolute', left: 20, right: 20, bottom: 40 },
});
