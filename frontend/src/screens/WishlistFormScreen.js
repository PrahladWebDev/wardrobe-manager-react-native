import React, { useState } from 'react';
import { Alert } from 'react-native';
import api from '../api/client';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Field from '../components/Field';
import StickyFooter, { FOOTER_SPACE } from '../components/StickyFooter';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';

const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const PRIORITIES = [
  { key: 'low', label: 'Low', icon: 'remove-circle-outline' },
  { key: 'medium', label: 'Medium', icon: 'ellipse-outline' },
  { key: 'high', label: 'High', icon: 'flame-outline' },
];

const isUrl = (s) => !s || /^https?:\/\/\S+$/i.test(s.trim());

export default function WishlistFormScreen({ navigation, route }) {
  const theme = useTheme();
  const toast = useToast();
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
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Give this wishlist item a name';
    if (!isUrl(link)) next.link = 'Links start with http:// or https://';
    if (!isUrl(imageUrl)) next.imageUrl = 'Image links start with http:// or https://';
    if (estimatedPrice && Number.isNaN(Number(estimatedPrice))) next.estimatedPrice = 'Enter a number';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { haptic.warning(); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category || null,
        brand: brand.trim(),
        estimatedPrice: estimatedPrice || 0,
        link: link.trim(),
        imageUrl: imageUrl.trim(),
        priority,
        notes: notes.trim(),
      };
      if (isEdit) await api.put(`/wishlist/${existing._id}`, payload);
      else await api.post('/wishlist', payload);
      haptic.success();
      toast(isEdit ? 'Wishlist item updated' : `${name.trim()} added to your wishlist`);
      navigation.goBack();
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    haptic.warning();
    Alert.alert('Remove item', `Remove "${existing.name}" from your wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/wishlist/${existing._id}`);
            toast('Removed from wishlist');
            navigation.goBack();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      },
    ]);
  };

  const clearError = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

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
          <Button title={isEdit ? 'Save changes' : 'Add to wishlist'} onPress={handleSave} loading={saving} />
        </StickyFooter>
      }
    >
      <Input label="Name" value={name} onChangeText={(t) => { setName(t); clearError('name'); }} placeholder="e.g. Brown leather boots" error={errors.name} />

      <Field label="Category (optional)">
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} small active={category === c} onPress={() => setCategory(category === c ? '' : c)} style={{ marginBottom: 8 }} />
        ))}
      </Field>

      <Input label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Clarks" leftIcon="pricetag-outline" />
      <Input label="Estimated price (₹)" value={estimatedPrice} onChangeText={(t) => { setEstimatedPrice(t); clearError('estimatedPrice'); }} placeholder="0" keyboardType="numeric" leftIcon="cash-outline" error={errors.estimatedPrice} />
      <Input label="Link (optional)" value={link} onChangeText={(t) => { setLink(t); clearError('link'); }} placeholder="https://…" autoCapitalize="none" keyboardType="url" leftIcon="link-outline" error={errors.link} />
      <Input label="Image URL (optional)" value={imageUrl} onChangeText={(t) => { setImageUrl(t); clearError('imageUrl'); }} placeholder="https://…" autoCapitalize="none" keyboardType="url" leftIcon="image-outline" error={errors.imageUrl} />

      <Field label="Priority">
        {PRIORITIES.map((p) => (
          <Chip key={p.key} label={p.label} small icon={p.icon} active={priority === p.key} onPress={() => setPriority(p.key)} style={{ marginBottom: 8 }} />
        ))}
      </Field>

      <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Why you want it, size, color…" multiline />

      {isEdit && (
        <Button title="Remove from wishlist" icon="trash-outline" variant="danger" onPress={handleDelete} style={{ marginTop: theme.spacing(2) }} />
      )}
    </Screen>
  );
}
