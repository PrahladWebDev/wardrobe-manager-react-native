import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors, radius, typography, spacing } from '../theme/colors';

export default function ItemDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/items/${id}`);
      setItem(data.item);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <Ionicons name="shirt-outline" size={50} color={colors.textFaint} />
        )}
        <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
          <Ionicons name={item.favorite ? 'heart' : 'heart-outline'} size={22} color={item.favorite ? colors.danger : colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={typography.h1}>{item.name}</Text>
      <Text style={[typography.bodyMuted, { marginTop: 2, marginBottom: 16, textTransform: 'capitalize' }]}>
        {item.category} · {item.color || 'no color set'} · {item.season}
      </Text>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={typography.h2}>{item.wearCount}</Text>
          <Text style={typography.label}>WEARS</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={typography.h2}>₹{item.price || 0}</Text>
          <Text style={typography.label}>PRICE</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={typography.h2}>{costPerWear ? `₹${costPerWear}` : '—'}</Text>
          <Text style={typography.label}>COST/WEAR</Text>
        </Card>
      </View>

      {item.occasions?.length > 0 && (
        <View style={styles.tagRow}>
          {item.occasions.map((o) => (
            <View key={o} style={styles.tag}><Text style={styles.tagText}>{o}</Text></View>
          ))}
        </View>
      )}

      {item.brand ? (
        <Text style={[typography.bodyMuted, { marginBottom: 4 }]}>Brand: {item.brand}</Text>
      ) : null}
      <Text style={[typography.bodyMuted, { marginBottom: 20 }]}>
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
      <Button
        title="Edit Item"
        variant="outline"
        onPress={() => navigation.navigate('AddItem', { item })}
        style={{ marginTop: 10 }}
      />
      <Button title="Delete Item" variant="danger" onPress={handleDelete} style={{ marginTop: spacing(6) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  imageWrap: {
    width: '100%',
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  favBtn: {
    position: 'absolute', top: 12, right: 12, backgroundColor: '#fff',
    borderRadius: radius.pill, padding: 8,
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  tag: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  tagText: { color: colors.accent, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
