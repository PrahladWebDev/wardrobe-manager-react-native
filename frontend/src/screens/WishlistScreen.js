import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Card from '../components/Card';
import Chip from '../components/Chip';
import PillBadge from '../components/PillBadge';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const PRIORITY_META = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'accent' },
  low: { label: 'Low', tone: 'neutral' },
};

const FILTERS = [
  { key: 'active', label: 'Wishlist' },
  { key: 'purchased', label: 'Purchased' },
];

export default function WishlistScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f = filter) => {
    setLoading(true);
    try {
      const { data } = await api.get('/wishlist', { params: { purchased: f === 'purchased' } });
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(filter); }, [load, filter]));

  const togglePurchased = async (item) => {
    if (!item.purchased) {
      Alert.alert('Mark as purchased?', `Add "${item.name}" to your wardrobe too?`, [
        { text: 'Just mark purchased', onPress: () => markPurchased(item, false) },
        { text: 'Add to wardrobe', onPress: () => markPurchased(item, true) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      markPurchased(item, false, false);
    }
  };

  const markPurchased = async (item, addToWardrobe, purchased = true) => {
    try {
      const { data } = await api.patch(`/wishlist/${item._id}/purchased`, { purchased, addToWardrobe });
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      if (addToWardrobe && data.item.linkedItem) {
        Alert.alert('Added!', 'It\'s now in your wardrobe too.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Remove from wishlist', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/wishlist/${item._id}`);
            setItems((prev) => prev.filter((i) => i._id !== item._id));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={theme.typography.h1}>🛍️ Wishlist</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('WishlistForm')}>
          <Ionicons name="add" size={22} color={theme.colors.onAccent} />
        </TouchableOpacity>
      </View>

      {filter === 'active' && summary && (
        <Card style={styles.summaryCard}>
          <View style={{ flex: 1 }}>
            <Text style={theme.typography.h2}>₹{summary.totalEstimated}</Text>
            <Text style={theme.typography.label}>ESTIMATED TOTAL</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={theme.typography.h2}>{summary.count}</Text>
            <Text style={theme.typography.label}>ITEMS WANTED</Text>
          </View>
        </Card>
      )}

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, marginBottom: 4, gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshing={loading}
        onRefresh={() => load(filter)}
        renderItem={({ item }) => {
          const meta = PRIORITY_META[item.priority] || PRIORITY_META.medium;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('WishlistForm', { item })}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.85}
            >
              <View style={styles.thumb}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="bag-outline" size={22} color={theme.colors.textFaint} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  {item.estimatedPrice > 0 && <Text style={theme.typography.bodyMuted}>₹{item.estimatedPrice}</Text>}
                  {!item.purchased && <PillBadge label={meta.label} tone={meta.tone} />}
                </View>
                {item.link ? (
                  <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={{ marginTop: 4 }}>
                    <Text style={[theme.typography.bodyMuted, { color: theme.colors.accent, textDecorationLine: 'underline' }]}>View listing</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => togglePurchased(item)} style={styles.checkBtn}>
                <Ionicons
                  name={item.purchased ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={item.purchased ? theme.colors.success : theme.colors.textFaint}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="bag-handle-outline"
            title={filter === 'active' ? 'Nothing on your wishlist' : 'Nothing purchased yet'}
            subtitle={filter === 'active' ? 'Tap + to add something you want to buy' : 'Items you mark purchased show up here'}
          />
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
  summaryCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, borderWidth: theme.border.width, borderColor: theme.colors.text,
    padding: 14, marginBottom: 12, ...theme.shadow.subtle,
  },
  thumb: {
    width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  checkBtn: { paddingLeft: 8 },
});
