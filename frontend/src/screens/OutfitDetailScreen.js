import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { labelForDressCode } from '../constants/dressCodes';

export default function OutfitDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { id } = route.params;
  const [outfit, setOutfit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/outfits/${id}`);
      setOutfit(data.outfit);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [id]));

  const logWear = async () => {
    setBusy(true);
    try {
      await api.post(`/outfits/${id}/wear`);
      await load();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete outfit', `Remove "${outfit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/outfits/${id}`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (!outfit) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={theme.typography.h1}>{outfit.name}</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 20, textTransform: 'capitalize' }]}>
        {labelForDressCode(outfit.occasion)} · worn {outfit.wearCount}x{outfit.lastWornAt ? ` · last worn ${new Date(outfit.lastWornAt).toLocaleDateString()}` : ''}
      </Text>

      <FlatList
        data={outfit.items}
        keyExtractor={(i) => i._id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <View style={styles.pieceCard}>
            <View style={styles.pieceImg}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} /> : (
                <Ionicons name="shirt-outline" size={26} color={theme.colors.textFaint} />
              )}
            </View>
            <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
            <Text style={theme.typography.bodyMuted}>{item.category}</Text>
          </View>
        )}
      />

      <Button title="Log Today's Wear (all pieces)" onPress={logWear} loading={busy} style={{ marginTop: theme.spacing(4) }} />
      <Button title="Edit Outfit" variant="outline" onPress={() => navigation.navigate('CreateOutfit', { outfit })} style={{ marginTop: 10 }} />
      <Button title="Delete Outfit" variant="danger" onPress={handleDelete} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  pieceCard: {
    width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    padding: 10, marginBottom: 14, ...theme.shadow.subtle,
  },
  pieceImg: {
    width: '100%', height: 110, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden',
  },
});
