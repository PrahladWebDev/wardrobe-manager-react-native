import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Thumb from '../components/Thumb';
import PillBadge from '../components/PillBadge';
import IconButton from '../components/IconButton';
import StatTile from '../components/StatTile';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ActionSheet from '../components/ActionSheet';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';

const PRIORITY_META = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'accent' },
  low: { label: 'Low', tone: 'neutral' },
};

const FILTERS = [
  { key: 'active', label: 'Wishlist' },
  { key: 'purchased', label: 'Purchased' },
];

const formatMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function WishlistScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [filter, setFilter] = useState('active');
  const [actionItem, setActionItem] = useState(null);

  const { data, status, error, refreshing, refresh, reload, setData } = useFocusedFetch(
    () => api.get('/wishlist', { params: { purchased: filter === 'purchased' } }).then((r) => ({ items: r.data.items || [], summary: r.data.summary || null })),
    [filter]
  );
  const items = data?.items || [];
  const summary = data?.summary;

  const removeLocal = (id) => setData((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i._id !== id) } : prev));

  const markPurchased = async (item, addToWardrobe, purchased = true) => {
    try {
      const { data: res } = await api.patch(`/wishlist/${item._id}/purchased`, { purchased, addToWardrobe });
      removeLocal(item._id);
      haptic.success();
      if (addToWardrobe && res.item.linkedItem) toast('Marked purchased and added to your closet');
      else toast(purchased ? 'Marked as purchased' : 'Moved back to wishlist');
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    }
  };

  const togglePurchased = (item) => {
    if (item.purchased) return markPurchased(item, false, false);
    setActionItem({ ...item, mode: 'purchase' });
  };

  const handleDelete = (item) => {
    haptic.warning();
    Alert.alert('Remove from wishlist', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/wishlist/${item._id}`);
            removeLocal(item._id);
            toast('Removed from wishlist');
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      },
    ]);
  };

  const renderEmpty = () => {
    if (status === 'loading') return <SkeletonList count={4} thumb={52} style={{ paddingHorizontal: 20 }} />;
    if (status === 'error') return <ErrorState message={error} onRetry={reload} />;
    return (
      <EmptyState
        icon="bag-handle-outline"
        title={filter === 'active' ? 'Nothing on your wishlist' : 'Nothing purchased yet'}
        subtitle={filter === 'active' ? 'Keep track of pieces you want before you buy them.' : 'Items you mark purchased show up here.'}
        action={filter === 'active' ? { label: 'Add something', onPress: () => navigation.navigate('WishlistForm') } : undefined}
      />
    );
  };

  return (
    <Screen safeTop={false} tabInset={false} padded={false}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row' }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} small active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>
        <IconButton name="add" label="Add to wishlist" variant="filled" size={24} onPress={() => navigation.navigate('WishlistForm')} />
      </View>

      {filter === 'active' && summary && status === 'ready' && (
        <View style={styles.summaryRow}>
          <StatTile value={formatMoney(summary.totalEstimated)} label="Estimated total" compact />
          <StatTile value={summary.count} label="Wanted" compact />
          <StatTile value={summary.highPriorityCount} label="High priority" compact tone={summary.highPriorityCount ? 'danger' : 'neutral'} />
        </View>
      )}

      <FlatList
        data={status === 'ready' ? items : []}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} />}
        renderItem={({ item }) => {
          const meta = PRIORITY_META[item.priority] || PRIORITY_META.medium;
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('WishlistForm', { item })}
              onLongPress={() => setActionItem({ ...item, mode: 'menu' })}
              accessibilityLabel={`${item.name}${item.estimatedPrice ? `, ${formatMoney(item.estimatedPrice)}` : ''}, ${meta.label} priority`}
            >
              <Thumb uri={item.imageUrl} category={item.category || 'bag'} size={52} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8, flexWrap: 'wrap' }}>
                  {item.estimatedPrice > 0 && <Text style={theme.typography.bodyMuted}>{formatMoney(item.estimatedPrice)}</Text>}
                  {!item.purchased && <PillBadge label={meta.label} tone={meta.tone} />}
                  {item.brand ? <Text style={theme.typography.caption}>{item.brand}</Text> : null}
                </View>
                {item.link ? (
                  <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={{ marginTop: 4, alignSelf: 'flex-start' }} hitSlop={theme.hitSlop} accessibilityRole="link" accessibilityLabel="View listing">
                    <Text style={[theme.typography.caption, { color: theme.colors.accent, textDecorationLine: 'underline' }]}>View listing</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <IconButton
                name={item.purchased ? 'checkmark-circle' : 'ellipse-outline'}
                label={item.purchased ? 'Move back to wishlist' : 'Mark as purchased'}
                color={item.purchased ? theme.colors.success : theme.colors.textFaint}
                size={26}
                onPress={() => togglePurchased(item)}
              />
            </Card>
          );
        }}
        ListEmptyComponent={renderEmpty()}
      />

      <ActionSheet
        visible={!!actionItem}
        title={actionItem?.name}
        subtitle={actionItem?.mode === 'purchase' ? 'Mark as purchased' : undefined}
        onClose={() => setActionItem(null)}
        actions={
          !actionItem ? [] : actionItem.mode === 'purchase' ? [
            { label: 'Purchased, add to my closet', icon: 'shirt-outline', subtitle: 'Creates a wardrobe item with these details', onPress: () => markPurchased(actionItem, true) },
            { label: 'Just mark purchased', icon: 'checkmark-circle-outline', onPress: () => markPurchased(actionItem, false) },
          ] : [
            { label: 'Edit', icon: 'create-outline', onPress: () => navigation.navigate('WishlistForm', { item: actionItem }) },
            ...(actionItem.link ? [{ label: 'Open listing', icon: 'open-outline', onPress: () => Linking.openURL(actionItem.link) }] : []),
            { label: 'Remove from wishlist', icon: 'trash-outline', destructive: true, onPress: () => handleDelete(actionItem) },
          ]
        }
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 6 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 8, marginBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12, ...theme.shadow.subtle },
});
