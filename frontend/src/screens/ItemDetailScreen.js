import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Input from '../components/Input';
import { useTheme } from '../context/ThemeContext';
import { labelForDressCode } from '../constants/dressCodes';

const REPAIR_STATUS_OPTIONS = [
  { key: 'none', label: 'Good' },
  { key: 'needs_repair', label: 'Needs Repair' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'repaired', label: 'Repaired' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function CompleteTheLook({ itemId, navigation, theme }) {
  const styles = makeStyles(theme);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/suggestion/complete-look/${itemId}`)
      .then(({ data }) => { if (!cancelled) setSuggestions(data.suggestions || {}); })
      .catch(() => { if (!cancelled) setSuggestions({}); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]));

  const categories = suggestions ? Object.keys(suggestions) : [];
  if (!loading && categories.length === 0) return null;

  return (
    <View style={{ marginTop: theme.spacing(6) }}>
      <Text style={[theme.typography.h3, { marginBottom: 12 }]}>Complete the Look</Text>
      {loading && <Text style={theme.typography.bodyMuted}>Finding pairings…</Text>}
      {categories.map((cat) => (
        <View key={cat} style={{ marginBottom: 16 }}>
          <Text style={[theme.typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{cat}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions[cat].map((it) => (
              <TouchableOpacity
                key={it._id}
                style={styles.suggestionCard}
                onPress={() => navigation.push('ItemDetail', { id: it._id })}
                activeOpacity={0.85}
              >
                <View style={styles.suggestionImg}>
                  {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={{ width: '100%', height: '100%' }} /> : (
                    <Ionicons name="shirt-outline" size={22} color={theme.colors.textFaint} />
                  )}
                </View>
                <Text style={styles.suggestionName} numberOfLines={1}>{it.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

export default function ItemDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [repairNotes, setRepairNotes] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [savingRepair, setSavingRepair] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/items/${id}`);
      setItem(data.item);
      setActivePhoto(0);
      setRepairNotes(data.item.repair?.notes || '');
      setRepairCost(data.item.repair?.cost ? String(data.item.repair.cost) : '');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const logWear = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/items/${id}/wear`);
      setItem(data.item);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleLaundry = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/items/${id}/laundry`, { inLaundry: !item.inLaundry });
      setItem(data.item);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data } = await api.put(`/items/${id}`, { favorite: !item.favorite });
      setItem(data.item);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const setRepairStatus = async (status) => {
    setSavingRepair(true);
    try {
      const { data } = await api.put(`/items/${id}/repair`, { status, notes: repairNotes, cost: repairCost || 0 });
      setItem(data.item);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingRepair(false);
    }
  };

  const saveRepairDetails = async () => {
    setSavingRepair(true);
    try {
      const { data } = await api.put(`/items/${id}/repair`, { notes: repairNotes, cost: repairCost || 0 });
      setItem(data.item);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingRepair(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete item', `Remove "${item.name}" from your wardrobe?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/items/${id}`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading || !item) return <View style={styles.container} />;

  const costPerWear = item.price > 0 ? (item.price / Math.max(item.wearCount, 1)).toFixed(0) : null;
  const photos = item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.imageWrap}>
        {photos.length ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40)))}
            >
              {photos.map((url, i) => (
                <Image key={`${url}-${i}`} source={{ uri: url }} style={[styles.image, { width: SCREEN_WIDTH - 40 }]} />
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <View style={styles.dots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <Ionicons name="shirt-outline" size={50} color={theme.colors.textFaint} />
        )}
        <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
          <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={22} color={item.favorite ? theme.colors.danger : theme.colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={theme.typography.h1}>{item.name}</Text>
      <Text style={[theme.typography.bodyMuted, { marginTop: 2, marginBottom: 16, textTransform: 'capitalize' }]}>
        {item.category} · {item.color || 'no color set'} · {item.season}
      </Text>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={theme.typography.h2}>{item.wearCount}</Text>
          <Text style={theme.typography.label}>WEARS</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={theme.typography.h2}>₹{item.price || 0}</Text>
          <Text style={theme.typography.label}>PRICE</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={theme.typography.h2}>{costPerWear ? `₹${costPerWear}` : '—'}</Text>
          <Text style={theme.typography.label}>COST/WEAR</Text>
        </Card>
      </View>

      {item.occasions?.length > 0 && (
        <View style={styles.tagRow}>
          {item.occasions.map((o) => (
            <View key={o} style={styles.tag}><Text style={styles.tagText}>{labelForDressCode(o)}</Text></View>
          ))}
        </View>
      )}

      {item.brand ? (
        <Text style={[theme.typography.bodyMuted, { marginBottom: 4 }]}>Brand: {item.brand}</Text>
      ) : null}
      <Text style={[theme.typography.bodyMuted, { marginBottom: 20 }]}>
        Last worn: {item.lastWornAt ? new Date(item.lastWornAt).toLocaleDateString() : 'Never'}
      </Text>

      <Button title="Log Today's Wear" onPress={logWear} loading={busy} />
      <Button
        title={item.inLaundry ? 'Mark as Clean' : 'Mark as In Laundry'}
        variant="outline"
        onPress={toggleLaundry}
        loading={busy}
        style={{ marginTop: 10 }}
      />

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 4 }]}>🔧 Repair Tracker</Text>
        <Text style={[theme.typography.bodyMuted, { marginBottom: 12 }]}>
          {item.repair?.status === 'none' || !item.repair
            ? "Mark this if it's damaged so you know not to reach for it."
            : item.repair.status === 'repaired'
              ? `Fixed${item.repair.resolvedAt ? ` on ${new Date(item.repair.resolvedAt).toLocaleDateString()}` : ''}.`
              : `Reported${item.repair.reportedAt ? ` on ${new Date(item.repair.reportedAt).toLocaleDateString()}` : ''} — excluded from Today/Surprise suggestions until fixed.`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {REPAIR_STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              active={(item.repair?.status || 'none') === opt.key}
              onPress={() => setRepairStatus(opt.key)}
            />
          ))}
        </View>
        {item.repair && item.repair.status !== 'none' && (
          <>
            <Input
              label="Repair notes"
              value={repairNotes}
              onChangeText={setRepairNotes}
              placeholder="e.g. torn seam on left sleeve"
              onBlur={saveRepairDetails}
            />
            <Input
              label="Repair cost (₹)"
              value={repairCost}
              onChangeText={setRepairCost}
              placeholder="0"
              keyboardType="numeric"
              onBlur={saveRepairDetails}
            />
          </>
        )}
      </Card>

      <Button
        title="Edit Item"
        variant="outline"
        onPress={() => navigation.navigate('AddItem', { item })}
        style={{ marginTop: 10 }}
      />
      <Button title="Delete Item" variant="danger" onPress={handleDelete} style={{ marginTop: theme.spacing(6) }} />

      <CompleteTheLook itemId={id} navigation={navigation} theme={theme} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  imageWrap: {
    width: '100%',
    height: 260,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { height: '100%' },
  dots: { position: 'absolute', bottom: 10, flexDirection: 'row', alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#fff', width: 8, height: 8, borderRadius: 4 },
  favBtn: {
    position: 'absolute', top: 12, right: 12, backgroundColor: '#fff',
    borderRadius: theme.radius.pill, padding: 8,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  tag: { backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  tagText: { color: theme.colors.accent, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  suggestionCard: { width: 90, marginRight: 10 },
  suggestionImg: {
    width: 90, height: 90, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden',
  },
  suggestionName: { fontSize: 12, color: theme.colors.textMuted },
});
