import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import ItemCard from '../components/ItemCard';
import { useTheme } from '../context/ThemeContext';
import { DRESS_CODES } from '../constants/dressCodes';

// Shared create/edit form. If route.params.outfit is passed, this screen edits that outfit instead.
export default function CreateOutfitScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const existing = route.params?.outfit || null;
  const isEdit = !!existing;
  const preset = route.params?.preset || null; // { items, name, occasion } — prefill a NEW outfit without editing one

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(existing ? (existing.items || []).map((i) => i._id) : (preset?.items || []));
  const [name, setName] = useState(existing?.name || preset?.name || '');
  const [occasion, setOccasion] = useState(existing?.occasion || preset?.occasion || 'casual');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/items', { params: { inLaundry: 'false', limit: 200 } });
        setItems(data.items);
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    })();
  }, []);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Missing name', 'Give this outfit a name');
    if (selected.length === 0) return Alert.alert('Pick items', 'Select at least one item for this outfit');
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/outfits/${existing._id}`, { name: name.trim(), items: selected, occasion });
      } else {
        await api.post('/outfits', { name: name.trim(), items: selected, occasion });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not save outfit', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Input label="Outfit name" value={name} onChangeText={setName} placeholder="e.g. Casual Weekend" />
        <Text style={styles.sectionLabel}>Occasion</Text>
        <FlatList
          data={DRESS_CODES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.key}
          renderItem={({ item: d }) => <Chip label={d.label} active={occasion === d.key} onPress={() => setOccasion(d.key)} />}
          style={{ marginBottom: 12 }}
        />
        <Text style={styles.sectionLabel}>Select pieces ({selected.length} selected)</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <ItemCard item={item} selected={selected.includes(item._id)} onToggleSelect={() => toggle(item._id)} />
        )}
      />

      <View style={{ padding: 20 }}>
        <Button title={isEdit ? 'Save Changes' : 'Save Outfit'} onPress={handleSave} loading={saving} />
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  sectionLabel: { ...theme.typography.label, textTransform: 'uppercase', marginBottom: 8 },
});
