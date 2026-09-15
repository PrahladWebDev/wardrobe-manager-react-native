import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Field from '../components/Field';
import ActionSheet from '../components/ActionSheet';
import StickyFooter, { FOOTER_SPACE } from '../components/StickyFooter';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';
import { DRESS_CODES } from '../constants/dressCodes';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const SEASONS = ['all', 'summer', 'winter', 'monsoon'];
const MAX_PHOTOS = 6;

const fileFromUri = (uri, fallback) => {
  const filename = uri.split('/').pop();
  const match = /\.(\w+)$/.exec(filename || '');
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  return { uri, name: filename || fallback, type };
};

// Shared create/edit form. If route.params.item is passed, this screen edits that item instead.
export default function AddItemScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const existing = route.params?.item || null;
  const isEdit = !!existing;

  // Each entry: { uri, existing: bool, url? (for existing photos, the original Cloudinary url) }
  const initialImages = existing
    ? (existing.images?.length ? existing.images : (existing.imageUrl ? [existing.imageUrl] : [])).map((url) => ({ uri: url, existing: true, url }))
    : [];
  const [images, setImages] = useState(initialImages);
  const [removedUrls, setRemovedUrls] = useState([]);
  const [name, setName] = useState(existing?.name || '');
  const [nameError, setNameError] = useState('');
  const [category, setCategory] = useState(existing?.category || 'top');
  const [season, setSeason] = useState(existing?.season || 'all');
  const [color, setColor] = useState(existing?.color || '');
  const [brand, setBrand] = useState(existing?.brand || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [occasions, setOccasions] = useState(existing?.occasions || []);
  const [removeBg, setRemoveBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);

  // Came back from the barcode scanner with a match -> prefill fields.
  useEffect(() => {
    const result = route.params?.barcodeResult;
    if (!result) return;
    if (result.name) setName(result.name);
    if (result.brand) setBrand(result.brand);
    if (result.price) setPrice(String(result.price));
    toast('Details filled in from the barcode. Double-check them.', 'info');
    navigation.setParams({ barcodeResult: undefined });
  }, [route.params?.barcodeResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const addImages = async (fromCamera) => {
    if (images.length >= MAX_PHOTOS) return toast(`You can add up to ${MAX_PHOTOS} photos per item`, 'info');
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', fromCamera ? 'Allow camera access to take a photo.' : 'Allow photo access to pick from your library.');
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: MAX_PHOTOS - images.length,
        });
    if (result.canceled) return;
    const picked = result.assets.map((a) => ({ uri: a.uri, existing: false }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    haptic.light();
  };

  const removeImage = (index) => {
    const img = images[index];
    if (img.existing && img.url) setRemovedUrls((prev) => [...prev, img.url]);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const scanReceipt = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Allow camera access to scan a receipt.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (result.canceled) return;

    setScanningReceipt(true);
    try {
      const form = new FormData();
      form.append('image', fileFromUri(result.assets[0].uri, 'receipt.jpg'));
      const { data } = await api.post('/items/scan-receipt', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!data.success) return toast('Could not read the receipt. Try a clearer, well-lit photo.', 'error');
      if (data.guessedName) setName(data.guessedName);
      if (data.guessedPrice) setPrice(String(data.guessedPrice));
      haptic.success();
      toast('Name and price filled in from the receipt. Double-check them.', 'info');
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setNameError('Give this item a name'); haptic.warning(); return; }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('category', category);
      form.append('season', season);
      form.append('color', color.trim());
      form.append('brand', brand.trim());
      form.append('price', price || '0');
      if (occasions.length) occasions.forEach((o) => form.append('occasions', o));
      else form.append('occasions', ''); // explicit empty marker so edits can clear all dress codes
      if (removeBg) form.append('removeBackground', 'true');
      if (isEdit && removedUrls.length) form.append('removeImages', JSON.stringify(removedUrls));
      images.filter((img) => !img.existing).forEach((img, i) => form.append('images', fileFromUri(img.uri, `photo-${i}.jpg`)));

      if (isEdit) await api.put(`/items/${existing._id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/items', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      haptic.success();
      toast(isEdit ? 'Item updated' : `${name.trim()} added to your closet`);
      navigation.goBack();
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      safeTop={false}
      tabInset={false}
      scroll
      keyboard
      keyboardOffset={90}
      contentStyle={{ paddingBottom: FOOTER_SPACE }}
      footer={
        <StickyFooter>
          <Button title={isEdit ? 'Save changes' : 'Save to closet'} onPress={handleSave} loading={saving} />
        </StickyFooter>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} keyboardShouldPersistTaps="handled">
        {images.map((img, i) => (
          <View key={`${img.uri}-${i}`} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" transition={150} />
            <TouchableOpacity
              style={styles.removeThumb}
              onPress={() => removeImage(i)}
              hitSlop={theme.hitSlop}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${i + 1}`}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {i === 0 && <View style={styles.coverTag}><Text style={styles.coverText}>COVER</Text></View>}
          </View>
        ))}
        {images.length < MAX_PHOTOS && (
          <TouchableOpacity style={styles.addThumb} onPress={() => setPhotoSheet(true)} accessibilityRole="button" accessibilityLabel="Add photo">
            <Ionicons name="camera-outline" size={26} color={theme.colors.accent} />
            <Text style={[theme.typography.small, { marginTop: 4 }]}>{images.length ? 'ADD MORE' : 'ADD PHOTO'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {scanningReceipt && <Text style={[theme.typography.caption, { marginBottom: 12 }]}>Scanning receipt…</Text>}

      {images.some((img) => !img.existing) && (
        <TouchableOpacity
          style={styles.bgToggle}
          onPress={() => setRemoveBg((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: removeBg }}
          accessibilityLabel="Remove background from new photos"
        >
          <Ionicons name={removeBg ? 'checkbox' : 'square-outline'} size={22} color={removeBg ? theme.colors.accent : theme.colors.textFaint} />
          <Text style={[theme.typography.bodyMuted, { marginLeft: 8 }]}>Remove background from new photos</Text>
        </TouchableOpacity>
      )}

      <Input
        label="Name"
        value={name}
        onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
        placeholder="e.g. Blue denim shirt"
        error={nameError}
        returnKeyType="next"
      />

      <Field label="Category">
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} small active={category === c} onPress={() => setCategory(c)} style={{ marginBottom: 8 }} />
        ))}
      </Field>

      <Field label="Season">
        {SEASONS.map((s) => (
          <Chip key={s} label={s === 'all' ? 'All year' : s} small active={season === s} onPress={() => setSeason(s)} style={{ marginBottom: 8 }} />
        ))}
      </Field>

      <Input label="Color" value={color} onChangeText={setColor} placeholder="e.g. Navy blue" leftIcon="color-palette-outline" />
      <Input label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Levi's" leftIcon="pricetag-outline" />
      <Input label="Price (₹)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" leftIcon="cash-outline" helperText="Used for cost-per-wear stats" />

      <Field label="Dress code" hint="Pick everything this piece works for">
        {DRESS_CODES.map((d) => (
          <Chip
            key={d.key}
            label={d.label}
            small
            icon={d.icon}
            active={occasions.includes(d.key)}
            onPress={() => setOccasions((prev) => (prev.includes(d.key) ? prev.filter((k) => k !== d.key) : [...prev, d.key]))}
            style={{ marginBottom: 8 }}
          />
        ))}
      </Field>

      <ActionSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        title="Add photo"
        actions={[
          { label: 'Take photo', icon: 'camera-outline', onPress: () => addImages(true) },
          { label: 'Choose from library', icon: 'images-outline', onPress: () => addImages(false) },
          { label: 'Scan barcode', icon: 'barcode-outline', subtitle: 'Fills in name, brand and price', onPress: () => navigation.navigate('BarcodeScan') },
          { label: 'Scan receipt', icon: 'receipt-outline', subtitle: 'Reads the name and price', onPress: scanReceipt },
        ]}
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  thumbWrap: {
    width: 100, height: 133, borderRadius: theme.radius.md, overflow: 'hidden', marginRight: 10,
    backgroundColor: theme.colors.surfaceAlt, borderWidth: theme.border.width, borderColor: theme.colors.text,
  },
  thumb: { width: '100%', height: '100%' },
  removeThumb: {
    position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.pill, width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  coverTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  coverText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  addThumb: {
    width: 100, height: 133, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: theme.border.width, borderColor: theme.colors.text, borderStyle: 'dashed', marginRight: 10,
  },
  bgToggle: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 12 },
});
