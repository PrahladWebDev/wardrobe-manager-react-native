import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import EmptyState from '../components/EmptyState';
import PillBadge from '../components/PillBadge';
import Chip from '../components/Chip';
import { useTheme } from '../context/ThemeContext';
import { DRESS_CODES, labelForDressCode } from '../constants/dressCodes';

const PAGE_SIZE = 20;
const DRESS_CODE_FILTERS = [{ key: 'all', label: 'All' }, ...DRESS_CODES];

export default function OutfitsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [outfits, setOutfits] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [freshFirst, setFreshFirst] = useState(false);
  const [dressCode, setDressCode] = useState('all');

  const load = useCallback(async (targetPage = 1, append = false, fresh = freshFirst, occ = dressCode) => {
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (fresh) params.sort = 'fresh';
      if (occ !== 'all') params.occasion = occ;
      const { data } = await api.get('/outfits', { params });
      setOutfits((prev) => (append ? [...prev, ...data.outfits] : data.outfits));
      setHasMore(!!data.pagination?.hasMore);
      setPage(targetPage);
    } catch (err) {
      console.warn(err.message);
    }
  }, [freshFirst, dressCode]);

  useFocusEffect(useCallback(() => { load(1, false); }, [load]));

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };

  const toggleFresh = () => {
    const next = !freshFirst;
    setFreshFirst(next);
    load(1, false, next, dressCode);
  };

  const selectDressCode = (key) => {
    setDressCode(key);
    load(1, false, freshFirst, key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={theme.typography.h1}>Outfits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateOutfit')}>
          <Ionicons name="add" size={22} color={theme.colors.onAccent} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={toggleFresh} style={styles.freshToggle} activeOpacity={0.7}>
        <Ionicons name={freshFirst ? 'leaf' : 'leaf-outline'} size={16} color={freshFirst ? theme.colors.accent : theme.colors.textMuted} />
        <Text style={[theme.typography.bodyMuted, freshFirst && { color: theme.colors.accent, fontWeight: '700' }, { marginLeft: 6 }]}>
          Fresh first (Outfit Rotation)
        </Text>
      </TouchableOpacity>

      <FlatList
        data={DRESS_CODE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.key}
        style={{ flexGrow: 0, marginBottom: 4 }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item: d }) => (
          <Chip label={d.label} active={dressCode === d.key} onPress={() => selectDressCode(d.key)} />
        )}
      />

      <FlatList
        data={outfits}
        keyExtractor={(o) => o._id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 110 }}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('OutfitDetail', { id: item._id })}>
            <View style={styles.thumbRow}>
              {item.items.slice(0, 4).map((it) => (
                <View key={it._id} style={styles.thumb}>
                  {it.imageUrl ? (
                    <Image source={{ uri: it.imageUrl }} style={styles.thumbImg} />
                  ) : (
                    <Ionicons name="shirt-outline" size={18} color={theme.colors.textFaint} />
                  )}
                </View>
              ))}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={theme.typography.h3}>{item.name}</Text>
              <Text style={theme.typography.bodyMuted}>{labelForDressCode(item.occasion)} · {item.items.length} pieces · worn {item.wearCount}x</Text>
              {item.inCooldown && <PillBadge label="Resting" tone="info" style={{ marginTop: 6 }} />}
            </View>
            {item.favorite && <Ionicons name="heart" size={18} color={theme.colors.danger} />}
          </TouchableOpacity>
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          <EmptyState icon="albums-outline" title="No outfits yet" subtitle="Combine items into an outfit to wear together" />
        }
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  addBtn: {
    width: 40, height: 40, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent,
    borderWidth: theme.border.width, borderColor: theme.colors.text, alignItems: 'center', justifyContent: 'center',
  },
  freshToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, borderWidth: theme.border.width, borderColor: theme.colors.text,
    padding: 14, marginBottom: 12, ...theme.shadow.subtle,
  },
  thumbRow: { flexDirection: 'row' },
  thumb: {
    width: 34, height: 34, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: -10, borderWidth: 2, borderColor: theme.colors.surface, overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
});
