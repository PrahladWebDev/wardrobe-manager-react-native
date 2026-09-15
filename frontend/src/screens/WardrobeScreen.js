import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Screen from '../components/Screen';
import ItemCard from '../components/ItemCard';
import Chip from '../components/Chip';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import FilterSheet from '../components/FilterSheet';
import ActionSheet from '../components/ActionSheet';
import { SkeletonGrid } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useDebounce from '../hooks/useDebounce';
import { haptic } from '../utils/haptics';
import { DRESS_CODES } from '../constants/dressCodes';

const CATEGORIES = ['all', 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const SEASONS = [{ key: 'all', label: 'Any season' }, { key: 'summer', label: 'Summer' }, { key: 'winter', label: 'Winter' }, { key: 'monsoon', label: 'Monsoon' }];
const STATUS = [{ key: 'any', label: 'Everything' }, { key: 'clean', label: 'Clean only' }, { key: 'laundry', label: 'In laundry' }, { key: 'favorite', label: 'Favorites' }];
const DRESS_CODE_FILTERS = [{ key: 'all', label: 'Any dress code' }, ...DRESS_CODES];
const PAGE_SIZE = 20;

export default function WardrobeScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [dressCode, setDressCode] = useState('all');
  const [season, setSeason] = useState('all');
  const [statusFilter, setStatusFilter] = useState('any');
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  const params = useMemo(() => {
    const p = {};
    if (category !== 'all') p.category = category;
    if (dressCode !== 'all') p.occasion = dressCode;
    if (season !== 'all') p.season = season;
    if (statusFilter === 'clean') p.inLaundry = 'false';
    if (statusFilter === 'laundry') p.inLaundry = 'true';
    if (statusFilter === 'favorite') p.favorite = 'true';
    if (query) p.search = query;
    return p;
  }, [category, dressCode, season, statusFilter, query]);

  const activeFilterCount = (dressCode !== 'all') + (season !== 'all') + (statusFilter !== 'any');
  const anyFilter = activeFilterCount > 0 || category !== 'all' || !!query;

  const fetchItems = useCallback(async (targetPage = 1, append = false) => {
    const id = ++requestId.current;
    try {
      const { data } = await api.get('/items', { params: { ...params, page: targetPage, limit: PAGE_SIZE } });
      if (id !== requestId.current) return; // a newer request superseded this one
      hasLoaded.current = true;
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(!!data.pagination?.hasMore);
      setPage(targetPage);
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (id !== requestId.current) return;
      if (hasLoaded.current) toast(err.message, 'error');
      else { setError(err.message); setStatus('error'); }
    }
  }, [params, toast]);

  useFocusEffect(useCallback(() => { fetchItems(1, false); }, [fetchItems]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems(1, false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || status !== 'ready') return;
    setLoadingMore(true);
    await fetchItems(page + 1, true);
    setLoadingMore(false);
  };

  const clearFilters = () => {
    setCategory('all'); setDressCode('all'); setSeason('all'); setStatusFilter('any'); setSearch('');
  };

  const patchItem = (updated) => setItems((prev) => prev.map((i) => (i._id === updated._id ? { ...i, ...updated } : i)));

  const quickAction = async (kind) => {
    const it = actionItem;
    if (!it) return;
    try {
      if (kind === 'wear') {
        const { data } = await api.post(`/items/${it._id}/wear`);
        patchItem(data.item); haptic.success(); toast(`Logged a wear for ${it.name}`);
      } else if (kind === 'laundry') {
        const { data } = await api.patch(`/items/${it._id}/laundry`, { inLaundry: !it.inLaundry });
        patchItem(data.item); haptic.light(); toast(data.item.inLaundry ? 'Moved to laundry' : 'Marked clean');
      } else if (kind === 'favorite') {
        const { data } = await api.put(`/items/${it._id}`, { favorite: !it.favorite });
        patchItem(data.item); haptic.light(); toast(data.item.favorite ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (err) {
      haptic.error(); toast(err.message, 'error');
    }
  };

  const filterSections = [
    { key: 'dress', title: 'Dress code', value: dressCode, options: DRESS_CODE_FILTERS, onChange: setDressCode },
    { key: 'season', title: 'Season', value: season, options: SEASONS, onChange: setSeason },
    { key: 'status', title: 'Status', value: statusFilter, options: STATUS, onChange: setStatusFilter },
  ];

  const renderEmpty = () => {
    if (status === 'loading') return <SkeletonGrid count={6} style={{ paddingHorizontal: 16 }} />;
    if (status === 'error') return <ErrorState message={error} onRetry={() => { setStatus('loading'); fetchItems(1, false); }} />;
    if (anyFilter) {
      return (
        <EmptyState
          icon="search-outline"
          title="No matches"
          subtitle="Nothing in your closet fits these filters."
          action={{ label: 'Clear filters', onPress: clearFilters }}
        />
      );
    }
    return (
      <EmptyState
        icon="shirt-outline"
        title="Your closet is empty"
        subtitle="Add a few pieces and Foldd will start suggesting outfits."
        action={{ label: 'Add your first item', onPress: () => navigation.navigate('AddItem') }}
      />
    );
  };

  return (
    <Screen
      title="My Closet"
      padded={false}
      right={
        <>
          <IconButton name="bag-handle-outline" label="Wishlist" onPress={() => navigation.navigate('Wishlist')} />
          <IconButton name="build-outline" label="Repair tracker" onPress={() => navigation.navigate('RepairTracker')} />
          <IconButton name="add" label="Add item" variant="filled" size={24} onPress={() => navigation.navigate('AddItem')} />
        </>
      }
    >
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your closet…"
            placeholderTextColor={theme.colors.textFaint}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            accessibilityLabel="Search your closet"
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={theme.hitSlop} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => { haptic.select(); setFiltersOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? theme.colors.onAccent : theme.colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item: c }) => <Chip label={c} small active={category === c} onPress={() => setCategory(c)} />}
      />

      <FlatList
        data={status === 'ready' ? items : []}
        keyExtractor={(i) => i._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: theme.layout.tabBarInset, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        initialNumToRender={8}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onPress={() => navigation.navigate('ItemDetail', { id: item._id })}
            onLongPress={setActionItem}
          />
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={renderEmpty()}
      />

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sections={filterSections}
        activeCount={activeFilterCount}
        onClear={() => { setDressCode('all'); setSeason('all'); setStatusFilter('any'); }}
      />

      <ActionSheet
        visible={!!actionItem}
        title={actionItem?.name}
        subtitle="Quick actions"
        onClose={() => setActionItem(null)}
        actions={actionItem ? [
          { label: 'Log a wear today', icon: 'checkmark-done-outline', onPress: () => quickAction('wear') },
          { label: actionItem.inLaundry ? 'Mark as clean' : 'Move to laundry', icon: 'water-outline', onPress: () => quickAction('laundry') },
          { label: actionItem.favorite ? 'Remove from favorites' : 'Add to favorites', icon: actionItem.favorite ? 'heart-dislike-outline' : 'heart-outline', onPress: () => quickAction('favorite') },
          { label: 'Open details', icon: 'open-outline', onPress: () => navigation.navigate('ItemDetail', { id: actionItem._id }) },
        ] : []}
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    minHeight: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, paddingVertical: 8, fontSize: 14, color: theme.colors.text },
  filterBtn: {
    width: 44, height: 44, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface, borderWidth: theme.border.width, borderColor: theme.colors.text,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: theme.colors.accent },
  filterCount: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: theme.colors.text, alignItems: 'center', justifyContent: 'center',
  },
  filterCountText: { color: theme.colors.bg, fontSize: 11, fontWeight: '800' },
  chipRow: { flexGrow: 0, marginBottom: 2 },
});
