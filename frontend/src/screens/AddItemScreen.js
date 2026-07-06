import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { colors, radius, typography, spacing } from '../theme/colors';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const SEASONS = ['all', 'summer', 'winter', 'monsoon'];
const MAX_PHOTOS = 6;

// Shared create/edit form. If route.params.item is passed, this screen edits that item instead.
export default function AddItemScreen({ navigation, route }) {
  const existing = route.params?.item || null;
  const isEdit = !!existing;

  // Each entry: { uri, existing: bool, url? (for existing photos, the original Cloudinary url) }
  const initialImages = existing
    ? (existing.images?.length ? existing.images : (existing.imageUrl ? [existing.imageUrl] : [])).map((url) => ({ uri: url, existing: true, url }))
    : [];
  const [images, setImages] = useState(initialImages);
  const [removedUrls, setRemovedUrls] = useState([]);
  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState(existing?.category || 'top');
  const [season, setSeason] = useState(existing?.season || 'all');
  const [color, setColor] = useState(existing?.color || '');
  const [brand, setBrand] = useState(existing?.brand || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [occasions, setOccasions] = useState((existing?.occasions || []).join(', '));
  const [removeBg, setRemoveBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  // Came back from the barcode scanner with a match -> prefill fields.
  useEffect(() => {
    const result = route.params?.barcodeResult;
    if (!result) return;
    if (result.name) setName(result.name);
    if (result.brand) setBrand(result.brand);
    if (result.price) setPrice(String(result.price));
    navigation.setParams({ barcodeResult: undefined });
  }, [route.params?.barcodeResult]);

  const addImages = async (fromCamera) => {
    if (images.length >= MAX_PHOTOS) {
      return Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos per item.`);
    }
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', 'Please allow access to continue.');
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: MAX_PHOTOS - images.length,
        });
    if (result.canceled) return;
    const picked = result.assets.map((a) => ({ uri: a.uri, existing: false }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  };

  const removeImage = (index) => {
    const img = images[index];
    if (img.existing && img.url) setRemovedUrls((prev) => [...prev, img.url]);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const scanReceipt = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Please allow camera access to continue.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6 });
    if (result.canceled) return;

    setScanningReceipt(true);
    try {
      const form = new FormData();
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      form.append('image', { uri: asset.uri, name: filename || 'receipt.jpg', type });

      const { data } = await api.post('/items/scan-receipt', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!data.success) {
        return Alert.alert('Could not read receipt', "Try a clearer, well-lit photo, or fill the details in manually.");
      }
      if (data.guessedName) setName(data.guessedName);
      if (data.guessedPrice) setPrice(String(data.guessedPrice));
      Alert.alert('Receipt scanned', 'Name and price have been pre-filled — please double check them.');
    } catch (err) {
      Alert.alert('Could not scan receipt', err.message);
    } finally {
      setScanningReceipt(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Missing name', 'Give this item a name');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('category', category);
      form.append('season', season);
      form.append('color', color);
      form.append('brand', brand);
      form.append('price', price || '0');
      form.append('occasions', occasions);
      if (removeBg) form.append('removeBackground', 'true');
      if (isEdit && removedUrls.length) form.append('removeImages', JSON.stringify(removedUrls));

      images.filter((img) => !img.existing).forEach((img, i) => {
        const filename = img.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        form.append('images', { uri: img.uri, name: filename || `photo-${i}.jpg`, type });
      });

      if (isEdit) {
        await api.put(`/items/${existing._id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/items', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save item', err.message);
    } finally {
      setSaving(false);
    }
  };

  const openPhotoOptions = () => Alert.alert('Add photo', '', [
    { text: 'Take Photo', onPress: () => addImages(true) },
    { text: 'Choose from Library', onPress: () => addImages(false) },
    { text: 'Scan Barcode', onPress: () => navigation.navigate('BarcodeScan') },
    { text: 'Scan Receipt', onPress: scanReceipt },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {images.map((img, i) => (
          <View key={`${img.uri}-${i}`} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            <TouchableOpacity style={styles.removeThumb} onPress={() => removeImage(i)}>
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < MAX_PHOTOS && (
          <TouchableOpacity style={styles.addThumb} onPress={openPhotoOptions}>
            <Ionicons name="camera-outline" size={26} color={colors.textFaint} />
            <Text style={[typography.bodyMuted, { fontSize: 11, marginTop: 4 }]}>Add photo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {scanningReceipt && <Text style={[typography.bodyMuted, { marginBottom: 12 }]}>Scanning receipt…</Text>}

      {images.some((img) => !img.existing) && (
        <TouchableOpacity style={styles.bgToggle} onPress={() => setRemoveBg((v) => !v)} activeOpacity={0.8}>
          <Ionicons name={removeBg ? 'checkbox' : 'square-outline'} size={20} color={removeBg ? colors.accent : colors.textFaint} />
          <Text style={[typography.bodyMuted, { marginLeft: 8 }]}>Remove background from new photos</Text>
        </TouchableOpacity>
      )}

      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Blue Denim Shirt" />

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.chipWrap}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} style={{ marginBottom: 8 }} />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Season</Text>
      <View style={styles.chipWrap}>
        {SEASONS.map((s) => (
          <Chip key={s} label={s} active={season === s} onPress={() => setSeason(s)} style={{ marginBottom: 8 }} />
        ))}
      </View>

      <Input label="Color" value={color} onChangeText={setColor} placeholder="e.g. Navy Blue" />
      <Input label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Levi's" />
      <Input label="Price (₹)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
      <Input label="Occasions (comma separated)" value={occasions} onChangeText={setOccasions} placeholder="casual, work, formal" />

      <Button title={isEdit ? 'Save Changes' : 'Save to Wardrobe'} onPress={handleSave} loading={saving} style={{ marginTop: spacing(4) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  thumbWrap: { width: 100, height: 130, borderRadius: radius.lg, overflow: 'hidden', marginRight: 10, backgroundColor: colors.surfaceAlt },
  thumb: { width: '100%', height: '100%' },
  removeThumb: {
    position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill, width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  addThumb: {
    width: 100, height: 130, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginRight: 10,
  },
  bgToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 20 },
  sectionLabel: { ...typography.label, textTransform: 'uppercase', marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
});
