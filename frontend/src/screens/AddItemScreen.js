import React, { useState } from 'react';
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

// Shared create/edit form. If route.params.item is passed, this screen edits that item instead.
export default function AddItemScreen({ navigation, route }) {
  const existing = route.params?.item || null;
  const isEdit = !!existing;

  const [image, setImage] = useState(existing?.imageUrl ? { uri: existing.imageUrl, existing: true } : null);
  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState(existing?.category || 'top');
  const [season, setSeason] = useState(existing?.season || 'all');
  const [color, setColor] = useState(existing?.color || '');
  const [brand, setBrand] = useState(existing?.brand || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [occasions, setOccasions] = useState((existing?.occasions || []).join(', '));
  const [removeBg, setRemoveBg] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async (fromCamera) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', 'Please allow access to continue.');
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [3, 4] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [3, 4] });
    if (!result.canceled) setImage(result.assets[0]);
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
      if (image && !image.existing) {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        form.append('image', { uri: image.uri, name: filename || 'photo.jpg', type });
      }
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
      <TouchableOpacity style={styles.imagePicker} onPress={() => Alert.alert('Add photo', '', [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ])}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color={colors.textFaint} />
            <Text style={[typography.bodyMuted, { marginTop: 6 }]}>Add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {image && !image.existing && (
        <TouchableOpacity style={styles.bgToggle} onPress={() => setRemoveBg((v) => !v)} activeOpacity={0.8}>
          <Ionicons name={removeBg ? 'checkbox' : 'square-outline'} size={20} color={removeBg ? colors.accent : colors.textFaint} />
          <Text style={[typography.bodyMuted, { marginLeft: 8 }]}>Remove background from this photo</Text>
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
  imagePicker: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bgToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionLabel: { ...typography.label, textTransform: 'uppercase', marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
});