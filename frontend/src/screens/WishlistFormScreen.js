import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

export default function WishlistFormScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const existing = route.params?.item || null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState(existing?.category || '');
  const [brand, setBrand] = useState(existing?.brand || '');
  const [estimatedPrice, setEstimatedPrice] = useState(existing?.estimatedPrice ? String(existing.estimatedPrice) : '');
  const [link, setLink] = useState(existing?.link || '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || '');
  const [priority, setPriority] = useState(existing?.priority || 'medium');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Missing name', 'Give this wishlist item a name');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category || undefined,
        brand,
        estimatedPrice: estimatedPrice || 0,
        link,
        imageUrl,
        priority,
        notes,
      };
      if (isEdit) {
        await api.put(`/wishlist/${existing._id}`, payload);
      } else {
        await api.post('/wishlist', payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove item', `Remove "${existing.name}" from your wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/wishlist/${existing._id}`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Brown Leather Boots" />

        <Text style={styles.sectionLabel}>Category (optional)</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? '' : c)} style={{ marginBottom: 8 }} />
          ))}
        </View>

        <Input label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Clarks" />
        <Input label="Estimated Price (₹)" value={estimatedPrice} onChangeText={setEstimatedPrice} placeholder="0" keyboardType="numeric" />
        <Input label="Link (optional)" value={link} onChangeText={setLink} placeholder="https://..." autoCapitalize="none" />
        <Input label="Image URL (optional)" value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." autoCapitalize="none" />

        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.chipWrap}>
          {PRIORITIES.map((p) => (
            <Chip key={p.key} label={p.label} active={priority === p.key} onPress={() => setPriority(p.key)} style={{ marginBottom: 8 }} />
          ))}
        </View>

        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Why you want it, size, color..." multiline style={{ height: 80, textAlignVertical: 'top' }} />

        <Button title={isEdit ? 'Save Changes' : 'Add to Wishlist'} onPress={handleSave} loading={saving} style={{ marginTop: theme.spacing(4) }} />
        {isEdit && (
          <Button title="Remove" variant="danger" onPress={handleDelete} style={{ marginTop: 10 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  sectionLabel: { ...theme.typography.label, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
});
