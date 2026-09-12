import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import ItemCard from '../components/ItemCard';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { DRESS_CODES } from '../constants/dressCodes';

const CATEGORIES = ['all', 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'bag'];
const DRESS_CODE_FILTERS = [{ key: 'all', label: 'All' }, ...DRESS_CODES];
const PAGE_SIZE = 20;

export default function WardrobeScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('all');
  const [dressCode, setDressCode] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async (targetPage = 1, append = false) => {
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (category !== 'all') params.category = category;
      if (dressCode !== 'all') params.occasion = dressCode;
      if (search) params.search = search;
      const { data } = await api.get('/items', { params });
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setHasMore(!!data.pagination?.hasMore);
      setPage(targetPage);
    } catch (err) {
      console.warn('Failed to load items', err.message);
    }
  }, [category, dressCode, search]);

  useFocusEffect(
    useCallback(() => {
      fetchItems(1, false);
    }, [fetchItems])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems(1, false);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchItems(page + 1, true);
    setLoadingMore(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={theme.colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your closet..."
            placeholderTextColor={theme.colors.textFaint}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchItems(1, false)}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddItem')}>
          <Ionicons name="add" size={24} color={theme.colors.onAccent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item: c }) => (
          <Chip label={c} active={category === c} onPress={() => setCategory(c)} />
        )}
      />

      <FlatList
        data={DRESS_CODE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.key}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item: d }) => (
          <Chip label={d.label} active={dressCode === d.key} onPress={() => setDressCode(d.key)} />
        )}
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => navigation.navigate('ItemDetail', { id: item._id })} />
        )}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 16 }} /> : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="shirt-outline"
            title="Your closet is empty"
            subtitle="Tap the + button to add your first item"
          />
        }
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
  },
  searchInput: { flex: 1, marginLeft: 8, paddingVertical: 10, fontSize: 14, color: theme.colors.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexGrow: 0, marginBottom: 4 },
});
