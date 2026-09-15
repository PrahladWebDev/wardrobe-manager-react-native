import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Input from '../components/Input';
import Thumb from '../components/Thumb';
import StatTile from '../components/StatTile';
import PillBadge from '../components/PillBadge';
import ErrorState from '../components/ErrorState';
import { DetailSkeleton, Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';
import { labelForDressCode } from '../constants/dressCodes';

const REPAIR_STATUS_OPTIONS = [
  { key: 'none', label: 'Good' },
  { key: 'needs_repair', label: 'Needs repair' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'repaired', label: 'Repaired' },
];

const formatMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function CompleteTheLook({ itemId, navigation, theme }) {
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
      <Text style={[theme.typography.h2, { marginBottom: 2 }]}>Complete the look</Text>
      <Text style={[theme.typography.caption, { marginBottom: 12 }]}>Pieces from your closet that pair well with this one</Text>
      {loading && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Skeleton width={96} height={96} /><Skeleton width={96} height={96} /><Skeleton width={96} height={96} />
        </View>
      )}
      {categories.map((cat) => (
        <View key={cat} style={{ marginBottom: 16 }}>
          <Text style={[theme.typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{cat}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suggestions[cat].map((it) => (
              <TouchableOpacity
                key={it._id}
                style={{ width: 96, marginRight: 10 }}
                onPress={() => navigation.push('ItemDetail', { id: it._id })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={it.name}
              >
                <Thumb uri={it.imageUrl} category={it.category} size={96} radius={theme.radius.md} style={{ marginBottom: 6 }} />
                <Text style={theme.typography.caption} numberOfLines={1}>{it.name}</Text>
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
  const toast = useToast();
  const { id } = route.params;
  const { width: screenWidth } = useWindowDimensions();
  const photoWidth = screenWidth - theme.layout.screenPadding * 2;

  const [activePhoto, setActivePhoto] = useState(0);
  const [wearBusy, setWearBusy] = useState(false);
  const [laundryBusy, setLaundryBusy] = useState(false);
  const [savingRepair, setSavingRepair] = useState(false);
  const [repairNotes, setRepairNotes] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const lastSavedRepair = useRef({ notes: '', cost: '' });

  const { data: item, status, error, reload, setData: setItem } = useFocusedFetch(async () => {
    const { data } = await api.get(`/items/${id}`);
    const notes = data.item.repair?.notes || '';
    const cost = data.item.repair?.cost ? String(data.item.repair.cost) : '';
    setRepairNotes(notes);
    setRepairCost(cost);
    lastSavedRepair.current = { notes, cost };
    setActivePhoto(0);
    return data.item;
  }, [id]);

  const run = async (setBusy, fn, successMessage) => {
    if (setBusy) setBusy(true);
    try {
      const updated = await fn();
      if (updated) setItem(updated);
      haptic.success();
      if (successMessage) toast(typeof successMessage === 'function' ? successMessage(updated) : successMessage);
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      if (setBusy) setBusy(false);
    }
  };

  const logWear = () => run(setWearBusy, async () => (await api.post(`/items/${id}/wear`)).data.item, 'Logged a wear for today');
  const toggleLaundry = () => run(setLaundryBusy, async () => (await api.patch(`/items/${id}/laundry`, { inLaundry: !item.inLaundry })).data.item, (u) => (u.inLaundry ? 'Moved to laundry' : 'Marked as clean'));
  const toggleFavorite = () => run(null, async () => (await api.put(`/items/${id}`, { favorite: !item.favorite })).data.item, (u) => (u.favorite ? 'Added to favorites' : 'Removed from favorites'));
  const setRepairStatus = (repairStatus) => run(setSavingRepair, async () => (await api.put(`/items/${id}/repair`, { status: repairStatus, notes: repairNotes, cost: repairCost || 0 })).data.item, 'Repair status updated');

  const saveRepairDetails = async () => {
    if (repairNotes === lastSavedRepair.current.notes && repairCost === lastSavedRepair.current.cost) return;
    lastSavedRepair.current = { notes: repairNotes, cost: repairCost };
    await run(setSavingRepair, async () => (await api.put(`/items/${id}/repair`, { notes: repairNotes, cost: repairCost || 0 })).data.item, 'Repair notes saved');
  };

  const handleDelete = () => {
    haptic.warning();
    Alert.alert('Delete item', `Remove "${item.name}" from your wardrobe? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/items/${id}`);
            toast('Item deleted');
            navigation.goBack();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      },
    ]);
  };

  if (status === 'loading') {
    return <Screen safeTop={false} tabInset={false} scroll><DetailSkeleton /></Screen>;
  }
  if (status === 'error' || !item) {
    return <Screen safeTop={false} tabInset={false}><ErrorState message={error} onRetry={reload} /></Screen>;
  }

  const costPerWear = item.price > 0 ? Math.round(item.price / Math.max(item.wearCount, 1)) : null;
  const photos = item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : []);
  const repairStatus = item.repair?.status || 'none';

  return (
    <Screen safeTop={false} tabInset={false} scroll keyboard keyboardOffset={90}>
      <View style={styles.imageWrap}>
        {photos.length ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / photoWidth))}
            >
              {photos.map((url, i) => (
                <Image key={`${url}-${i}`} source={{ uri: url }} style={{ width: photoWidth, height: '100%' }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
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
        <TouchableOpacity
          style={styles.favBtn}
          onPress={toggleFavorite}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={22} color={item.favorite ? theme.colors.danger : theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.badges}>
          {item.inLaundry && <PillBadge label="In laundry" tone="info" />}
          {(repairStatus === 'needs_repair' || repairStatus === 'in_progress') && <PillBadge label="In repair" tone="danger" />}
          {item.inCooldown && <PillBadge label="Resting" tone="neutral" />}
        </View>
      </View>

      <Text style={theme.typography.h1}>{item.name}</Text>
      <Text style={[theme.typography.bodyMuted, { marginTop: 2, marginBottom: 16, textTransform: 'capitalize' }]}>
        {item.category} · {item.color || 'no color set'} · {item.season}{item.brand ? ` · ${item.brand}` : ''}
      </Text>

      <View style={styles.statsRow}>
        <StatTile value={item.wearCount} label="Wears" compact />
        <StatTile value={formatMoney(item.price)} label="Price" compact />
        <StatTile value={costPerWear != null ? formatMoney(costPerWear) : '—'} label="Cost / wear" compact tone={costPerWear > 500 ? 'danger' : 'neutral'} />
      </View>

      {item.occasions?.length > 0 && (
        <View style={styles.tagRow}>
          {item.occasions.map((o) => <PillBadge key={o} label={labelForDressCode(o)} tone="accent" style={{ marginRight: 6, marginBottom: 6 }} />)}
        </View>
      )}

      <Text style={[theme.typography.caption, { marginBottom: 16 }]}>
        Last worn: {item.lastWornAt ? new Date(item.lastWornAt).toLocaleDateString() : 'never'}
      </Text>

      <Button title="Log today's wear" icon="checkmark-done-outline" onPress={logWear} loading={wearBusy} />
      <Button
        title={item.inLaundry ? 'Mark as clean' : 'Move to laundry'}
        icon="water-outline"
        variant="outline"
        onPress={toggleLaundry}
        loading={laundryBusy}
        style={{ marginTop: 10 }}
      />

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="build-outline" size={18} color={theme.colors.accent} />
          <Text style={[theme.typography.h3, { marginLeft: 8 }]}>Repair tracker</Text>
        </View>
        <Text style={[theme.typography.caption, { marginBottom: 12 }]}>
          {repairStatus === 'none'
            ? "Mark this if it's damaged so suggestions skip it until it's fixed."
            : repairStatus === 'repaired'
              ? `Fixed${item.repair.resolvedAt ? ` on ${new Date(item.repair.resolvedAt).toLocaleDateString()}` : ''}.`
              : `Reported${item.repair.reportedAt ? ` on ${new Date(item.repair.reportedAt).toLocaleDateString()}` : ''}. Excluded from Today and Surprise Me until fixed.`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {REPAIR_STATUS_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              label={opt.label}
              small
              active={repairStatus === opt.key}
              onPress={() => setRepairStatus(opt.key)}
              style={{ marginBottom: 8 }}
              textStyle={{ textTransform: 'none' }}
            />
          ))}
        </View>
        {repairStatus !== 'none' && (
          <>
            <Input
              label="Repair notes"
              value={repairNotes}
              onChangeText={setRepairNotes}
              placeholder="e.g. torn seam on left sleeve"
              onBlur={saveRepairDetails}
              helperText={savingRepair ? 'Saving…' : 'Saved automatically'}
            />
            <Input
              label="Repair cost (₹)"
              value={repairCost}
              onChangeText={setRepairCost}
              placeholder="0"
              keyboardType="numeric"
              onBlur={saveRepairDetails}
              containerStyle={{ marginBottom: 0 }}
            />
          </>
        )}
      </Card>

      <Button title="Edit item" icon="create-outline" variant="outline" onPress={() => navigation.navigate('AddItem', { item })} style={{ marginTop: 12 }} />
      <Button title="Delete item" icon="trash-outline" variant="danger" onPress={handleDelete} style={{ marginTop: theme.spacing(6) }} />

      <CompleteTheLook itemId={id} navigation={navigation} theme={theme} />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  imageWrap: {
    width: '100%',
    height: 300,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dots: { position: 'absolute', bottom: 10, flexDirection: 'row', alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginHorizontal: 3 },
  dotActive: { backgroundColor: '#FFFFFF', width: 8, height: 8, borderRadius: 4 },
  favBtn: {
    position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.surface, borderWidth: theme.border.width, borderColor: theme.colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  badges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
});
