import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import ItemCard from '../components/ItemCard';
import { colors, typography } from '../theme/colors';

const OCCASIONS = ['casual', 'work', 'formal', 'lounge', 'travel', 'party'];

// Shared create/edit form. If route.params.outfit is passed, this screen edits that outfit instead.
export default function CreateOutfitScreen({ navigation, route }) {
  const existing = route.params?.outfit || null;
  const isEdit = !!existing;

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState((existing?.items || []).map((i) => i._id));
  const [name, setName] = useState(existing?.name || '');
  const [occasion, setOccasion] = useState(existing?.occasion || 'casual');
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
          data={OCCASIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(o) => o}
          renderItem={({ item: o }) => <Chip label={o} active={occasion === o} onPress={() => setOccasion(o)} />}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionLabel: { ...typography.label, textTransform: 'uppercase', marginBottom: 8 },
});
