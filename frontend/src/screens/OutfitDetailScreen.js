import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import api from '../api/client';
import Screen from '../components/Screen';
import Button from '../components/Button';
import OutfitCollage from '../components/OutfitCollage';
import PillBadge from '../components/PillBadge';
import ErrorState from '../components/ErrorState';
import { DetailSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';
import { labelForDressCode } from '../constants/dressCodes';

export default function OutfitDetailScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const { id } = route.params;
  const [busy, setBusy] = useState(false);

  const { data: outfit, status, error, reload, refresh } = useFocusedFetch(async () => {
    const { data } = await api.get(`/outfits/${id}`);
    return { ...data.outfit, items: (data.outfit.items || []).filter(Boolean) };
  }, [id]);

  const logWear = async () => {
    setBusy(true);
    try {
      await api.post(`/outfits/${id}/wear`);
      haptic.success();
      toast(`Logged "${outfit.name}" for today`);
      await refresh();
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    haptic.warning();
    Alert.alert('Delete outfit', `Remove "${outfit.name}"? The pieces stay in your closet.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/outfits/${id}`);
            toast('Outfit deleted');
            navigation.goBack();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      },
    ]);
  };

  if (status === 'loading') return <Screen safeTop={false} tabInset={false} scroll><DetailSkeleton /></Screen>;
  if (status === 'error' || !outfit) return <Screen safeTop={false} tabInset={false}><ErrorState message={error} onRetry={reload} /></Screen>;

  const pieces = outfit.items.map((it) => ({ label: it.category, category: it.category, item: it }));
  const openPiece = (item) => navigation.navigate('WardrobeTab', { screen: 'ItemDetail', params: { id: item._id }, initial: false });

  return (
    <Screen safeTop={false} tabInset={false} scroll>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={theme.typography.h1}>{outfit.name}</Text>
          <Text style={[theme.typography.bodyMuted, { marginTop: 2 }]}>
            {labelForDressCode(outfit.occasion)} · {outfit.items.length} piece{outfit.items.length === 1 ? '' : 's'} · worn {outfit.wearCount}x
          </Text>
          {outfit.lastWornAt ? <Text style={theme.typography.caption}>Last worn {new Date(outfit.lastWornAt).toLocaleDateString()}</Text> : null}
        </View>
        {outfit.inCooldown && <PillBadge label="Resting" tone="info" />}
      </View>

      {pieces.length ? (
        <OutfitCollage pieces={pieces} onPressPiece={openPiece} tileAspect={0.9} style={{ marginTop: 18 }} />
      ) : (
        <Text style={[theme.typography.bodyMuted, { marginTop: 18 }]}>This outfit has no pieces left. Edit it to add some.</Text>
      )}

      <Button title="Log today's wear (all pieces)" icon="checkmark-done-outline" onPress={logWear} loading={busy} disabled={!pieces.length} style={{ marginTop: theme.spacing(4) }} />
      <Button title="Edit outfit" icon="create-outline" variant="outline" onPress={() => navigation.navigate('CreateOutfit', { outfit })} style={{ marginTop: 10 }} />
      <Button title="Delete outfit" icon="trash-outline" variant="danger" onPress={handleDelete} style={{ marginTop: theme.spacing(6) }} />
    </Screen>
  );
}

const makeStyles = () => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});
