import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Chip from '../components/Chip';
import WeatherPill from '../components/WeatherPill';
import OutfitCollage from '../components/OutfitCollage';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';
import { DRESS_CODES } from '../constants/dressCodes';

const OCCASIONS = [{ key: 'any', label: 'Any' }, ...DRESS_CODES];

export default function SurpriseOutfitScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [occasion, setOccasion] = useState('any');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(1)).current;
  const occasionRef = useRef(occasion);
  occasionRef.current = occasion;

  const roll = useCallback(async (occ) => {
    setLoading(true);
    reveal.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => spin.setValue(0));
    try {
      let lat; let lon;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch (_) {}

      const params = { lat, lon };
      if (occ && occ !== 'any') params.occasion = occ;
      const { data: res } = await api.get('/suggestion/surprise', { params });
      setData(res);
      haptic.light();
      Animated.timing(reveal, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    } catch (err) {
      reveal.setValue(1);
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [spin, reveal, toast]);

  // Reads the current occasion through a ref so returning to this screen
  // re-rolls with the chip that's actually selected.
  useFocusEffect(useCallback(() => { roll(occasionRef.current); }, [roll]));

  const outfit = data?.outfit || {};
  const pieces = [
    { label: 'Top', category: 'top', item: outfit.top },
    { label: 'Bottom', category: 'bottom', item: outfit.bottom },
    { label: 'Shoes', category: 'shoes', item: outfit.shoes },
    { label: 'Outerwear', category: 'outerwear', item: outfit.outerwear },
    { label: 'Accessory', category: 'accessory', item: outfit.accessory },
  ];
  const selectedItems = pieces.map((p) => p.item).filter(Boolean);

  const handleWearToday = async () => {
    if (!selectedItems.length) return;
    setBusy(true);
    try {
      await Promise.all(selectedItems.map((it) => api.post(`/items/${it._id}/wear`)));
      haptic.success();
      toast(`Logged today's outfit (${selectedItems.length} pieces)`);
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveOutfit = () => {
    if (!selectedItems.length) return;
    navigation.navigate('CreateOutfit', {
      preset: {
        items: selectedItems.map((it) => it._id),
        name: '',
        occasion: occasion === 'any' ? 'casual' : occasion,
      },
    });
  };

  const openPiece = (item) => navigation.navigate('WardrobeTab', { screen: 'ItemDetail', params: { id: item._id }, initial: false });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Screen safeTop={false} tabInset={false} scroll padded={false}>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 12, paddingHorizontal: 20 }]}>
        A random look from your closet, favoring pieces you haven't worn in a while.
      </Text>

      <FlatList
        data={OCCASIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(o) => o.key}
        style={{ marginBottom: 14, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item: o }) => (
          <Chip label={o.label} small icon={o.icon} active={occasion === o.key} onPress={() => { setOccasion(o.key); roll(o.key); }} />
        )}
      />

      <View style={{ paddingHorizontal: 20 }}>
        {data?.weather ? (
          <Card style={{ marginBottom: 14 }}><WeatherPill weather={data.weather} targetSeason={data.targetSeason} /></Card>
        ) : (
          <Skeleton height={76} radius={theme.radius.lg} style={{ marginBottom: 14 }} />
        )}

        <Animated.View style={{ opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
          {!data && loading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} width="48.5%" height={150} radius={theme.radius.md} style={{ marginBottom: 10 }} />)}
            </View>
          ) : selectedItems.length === 0 && !loading ? (
            <Card>
              <EmptyState compact icon="dice-outline" title="Not enough pieces" subtitle="Add a few more items for this dress code and try again." action={{ label: 'Show any dress code', onPress: () => { setOccasion('any'); roll('any'); } }} />
            </Card>
          ) : (
            <OutfitCollage pieces={pieces} onPressPiece={openPiece} tileAspect={0.9} />
          )}
        </Animated.View>

        {data?.missing?.length > 0 && selectedItems.length > 0 && (
          <Text style={[theme.typography.caption, { marginTop: 6 }]}>
            Missing {data.missing.join(', ')}. Add some to your closet for fuller surprises.
          </Text>
        )}

        {data?.rotation?.usedCooldown?.length > 0 && (
          <Text style={[theme.typography.caption, { marginTop: 6 }]}>
            Ran out of rested {data.rotation.usedCooldown.join(', ')}, so something recently worn is mixed in.
          </Text>
        )}

        <Animated.View style={{ transform: [{ rotate: spinDeg }], alignSelf: 'center', marginTop: theme.spacing(6) }}>
          <Button title="Shuffle again" icon="dice-outline" onPress={() => roll(occasion)} loading={loading} style={{ paddingHorizontal: 32 }} />
        </Animated.View>

        <View style={styles.actions}>
          <Button title="Wear this today" variant="outline" onPress={handleWearToday} loading={busy} disabled={!selectedItems.length} style={{ flex: 1 }} />
          <Button title="Save as outfit" variant="ghost" onPress={handleSaveOutfit} disabled={!selectedItems.length} style={{ flex: 1 }} />
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = () => StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
