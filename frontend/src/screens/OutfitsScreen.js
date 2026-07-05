import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import EmptyState from '../components/EmptyState';
import { colors, radius, typography, shadow } from '../theme/colors';

const PAGE_SIZE = 20;

export default function OutfitsScreen({ navigation }) {
  const [outfits, setOutfits] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (targetPage = 1, append = false) => {
    try {
      const { data } = await api.get('/outfits', { params: { page: targetPage, limit: PAGE_SIZE } });
      setOutfits((prev) => (append ? [...prev, ...data.outfits] : data.outfits));
      setHasMore(!!data.pagination?.hasMore);
      setPage(targetPage);
    } catch (err) {
      console.warn(err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(1, false); }, [load]));

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.h1}>Outfits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateOutfit')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={outfits}
        keyExtractor={(o) => o._id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
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
                    <Ionicons name="shirt-outline" size={18} color={colors.textFaint} />
                  )}
                </View>
              ))}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={typography.h3}>{item.name}</Text>
              <Text style={typography.bodyMuted}>{item.occasion} · {item.items.length} pieces · worn {item.wearCount}x</Text>
            </View>
            {item.favorite && <Ionicons name="heart" size={18} color={colors.danger} />}
          </TouchableOpacity>
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          <EmptyState icon="albums-outline" title="No outfits yet" subtitle="Combine items into an outfit to wear together" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
  addBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow.subtle,
  },
  thumbRow: { flexDirection: 'row' },
  thumb: {
    width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: -10, borderWidth: 2, borderColor: colors.surface, overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
});
