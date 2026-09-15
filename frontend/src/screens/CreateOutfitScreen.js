import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Field from '../components/Field';
import ItemCard from '../components/ItemCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import StickyFooter, { FOOTER_SPACE } from '../components/StickyFooter';
import { SkeletonGrid } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';
import { DRESS_CODES } from '../constants/dressCodes';

// Fetches every page so closets with more than one page of items can still
// build outfits from all of them.
async function fetchAllItems(params) {
  let page = 1;
  let all = [];
  for (;;) {
    const { data } = await api.get('/items', { params: { ...params, page, limit: 100 } });
    all = all.concat(data.items || []);
    if (!data.pagination?.hasMore || page >= 20) return all;
    page += 1;
  }
}

// Shared create/edit form. If route.params.outfit is passed, this screen edits that outfit instead.
export default function CreateOutfitScreen({ navigation, route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const existing = route.params?.outfit || null;
  const isEdit = !!existing;
  const preset = route.params?.preset || null; // { items, name, occasion } — prefill a NEW outfit without editing one

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(existing ? (existing.items || []).filter(Boolean).map((i) => i._id) : (preset?.items || []));
  const [name, setName] = useState(existing?.name || preset?.name || '');
  const [nameError, setNameError] = useState('');
  const [occasion, setOccasion] = useState(existing?.occasion || preset?.occasion || 'casual');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setStatus('loading');
    // Edit mode shows laundry pieces too, so an outfit's own items are never hidden.
    fetchAllItems(isEdit ? {} : { inLaundry: 'false' })
      .then((all) => { setItems(all); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.category || '').includes(q) || (i.color || '').toLowerCase().includes(q));
  }, [items, search]);

  const toggle = (id) => {
    haptic.select();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) { setNameError('Give this outfit a name'); return; }
    if (selected.length === 0) return toast('Select at least one piece', 'info');
    setSaving(true);
    try {
      if (isEdit) await api.put(`/outfits/${existing._id}`, { name: name.trim(), items: selected, occasion });
      else await api.post('/outfits', { name: name.trim(), items: selected, occasion });
      haptic.success();
      toast(isEdit ? 'Outfit updated' : 'Outfit saved');
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
      padded={false}
      keyboard
      footer={
        <StickyFooter>
          <Button title={isEdit ? 'Save changes' : `Save outfit${selected.length ? ` (${selected.length})` : ''}`} onPress={handleSave} loading={saving} />
        </StickyFooter>
      }
    >
      <FlatList
        data={status === 'ready' ? filtered : []}
        keyExtractor={(i) => i._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: FOOTER_SPACE, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20 }}>
            <Input
              label="Outfit name"
              value={name}
              onChangeText={(t) => { setName(t); if (nameError) setNameError(''); }}
              placeholder="e.g. Casual weekend"
              error={nameError}
              returnKeyType="done"
            />
            <Field label="Occasion">
              {DRESS_CODES.map((d) => (
                <Chip key={d.key} label={d.label} small icon={d.icon} active={occasion === d.key} onPress={() => setOccasion(d.key)} style={{ marginBottom: 8 }} />
              ))}
            </Field>
            <Field label={`Pieces · ${selected.length} selected`} row={false}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textFaint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by name, category or color"
                  placeholderTextColor={theme.colors.textFaint}
                  value={search}
                  onChangeText={setSearch}
                  accessibilityLabel="Filter pieces"
                />
              </View>
            </Field>
            {status === 'loading' && <SkeletonGrid count={4} />}
            {status === 'error' && <ErrorState message={error} onRetry={load} />}
          </View>
        }
        renderItem={({ item }) => (
          <ItemCard item={item} selected={selected.includes(item._id)} onToggleSelect={() => toggle(item._id)} />
        )}
        ListEmptyComponent={
          status === 'ready' ? (
            <EmptyState
              compact
              icon="shirt-outline"
              title={search ? 'No pieces match' : 'No clean pieces to choose from'}
              subtitle={search ? 'Try a different word.' : 'Add items to your closet, or mark some as clean.'}
            />
          ) : null
        }
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  searchBox: {
    flexDirection: 'row', alignItems: 'center', minHeight: 44,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, paddingHorizontal: 14,
    borderWidth: theme.border.width, borderColor: theme.colors.text,
  },
  searchInput: { flex: 1, marginLeft: 8, paddingVertical: 8, fontSize: 14, color: theme.colors.text },
});
