import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Thumb from '../components/Thumb';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import PillBadge from '../components/PillBadge';
import Chip from '../components/Chip';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { DRESS_CODES, labelForDressCode } from '../constants/dressCodes';

const PAGE_SIZE = 20;
const DRESS_CODE_FILTERS = [{ key: 'all', label: 'All' }, ...DRESS_CODES];

export default function OutfitsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [outfits, setOutfits] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [freshFirst, setFreshFirst] = useState(false);
  const [dressCode, setDressCode] = useState('all');
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  // Filter state lives in deps, so changing a chip re-runs the focus effect
  // exactly once (no more explicit load() + effect double-fetch).
  const load = useCallback(async (targetPage = 1, append = false) => {
    const id = ++requestId.current;
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (freshFirst) params.sort = 'fresh';
      if (dressCode !== 'all') params.occasion = dressCode;
      const { data } = await api.get('/outfits', { params });
      if (id !== requestId.current) return;
      hasLoaded.current = true;
      const clean = (data.outfits || []).map((o) => ({ ...o, items: (o.items || []).filter(Boolean) }));
      setOutfits((prev) => (append ? [...prev, ...clean] : clean));
      setHasMore(!!data.pagination?.hasMore);
      setPage(targetPage);
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (id !== requestId.current) return;
      if (hasLoaded.current) toast(err.message, 'error');
      else { setError(err.message); setStatus('error'); }
    }
  }, [freshFirst, dressCode, toast]);

  useFocusEffect(useCallback(() => { load(1, false); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(1, false); setRefreshing(false); };

  const loadMore = async () => {
    if (!hasMore || loadingMore || status !== 'ready') return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };

  const renderEmpty = () => {
    if (status === 'loading') return <SkeletonList count={5} thumb={64} style={{ paddingHorizontal: 20 }} />;
    if (status === 'error') return <ErrorState message={error} onRetry={() => { setStatus('loading'); load(1, false); }} />;
    if (dressCode !== 'all') {
      return <EmptyState icon="albums-outline" title="No outfits for this dress code" subtitle="Try another filter or create one." action={{ label: 'Show all outfits', onPress: () => setDressCode('all') }} />;
    }
    return (
      <EmptyState
        icon="albums-outline"
        title="No outfits yet"
        subtitle="Combine a few pieces into a look you can log with one tap."
        action={{ label: 'Create an outfit', onPress: () => navigation.navigate('CreateOutfit') }}
      />
    );
  };

  return (
    <Screen
      title="Outfits"
      padded={false}
      right={
        <>
          <IconButton name="people-outline" label="Outfit polls" onPress={() => navigation.navigate('Polls')} />
          <IconButton name="shuffle" label="Surprise me" onPress={() => navigation.navigate('SurpriseOutfit')} />
          <IconButton name="add" label="New outfit" variant="filled" size={24} onPress={() => navigation.navigate('CreateOutfit')} />
        </>
      }
    >
      <View style={styles.filterRow}>
        <Chip
          label="Fresh first"
          icon={freshFirst ? 'leaf' : 'leaf-outline'}
          small
          active={freshFirst}
          onPress={() => setFreshFirst((v) => !v)}
          textStyle={{ textTransform: 'none' }}
        />
        <FlatList
          data={DRESS_CODE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.key}
          style={{ flexGrow: 0 }}
          renderItem={({ item: d }) => (
            <Chip label={d.label} small active={dressCode === d.key} onPress={() => setDressCode(d.key)} />
          )}
        />
      </View>

      <FlatList
        data={status === 'ready' ? outfits : []}
        keyExtractor={(o) => o._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: theme.layout.tabBarInset, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        renderItem={({ item }) => {
          const pieces = item.items || [];
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('OutfitDetail', { id: item._id })}
              accessibilityLabel={`${item.name}, ${pieces.length} pieces, worn ${item.wearCount} times`}
            >
              <View style={styles.thumbRow}>
                {pieces.slice(0, 4).map((it, i) => (
                  <Thumb key={it._id || i} uri={it.imageUrl} category={it.category} size={40} radius={12} style={[styles.thumb, { zIndex: 4 - i }]} />
                ))}
                {pieces.length > 4 && (
                  <View style={[styles.thumb, styles.more]}><Text style={styles.moreText}>+{pieces.length - 4}</Text></View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
                <Text style={theme.typography.caption} numberOfLines={1}>
                  {labelForDressCode(item.occasion)} · {pieces.length} piece{pieces.length === 1 ? '' : 's'} · worn {item.wearCount}x
                </Text>
                {item.inCooldown && <PillBadge label="Resting" tone="info" style={{ marginTop: 6 }} />}
              </View>
              {item.favorite && <Ionicons name="heart" size={18} color={theme.colors.danger} />}
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} style={{ marginLeft: 6 }} />
            </Card>
          );
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={renderEmpty()}
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, marginBottom: 2 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12, ...theme.shadow.subtle },
  thumbRow: { flexDirection: 'row', paddingRight: 10 },
  thumb: { marginRight: -12, borderWidth: 2, borderColor: theme.colors.surface },
  more: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  moreText: { ...theme.typography.small, color: theme.colors.text },
});
