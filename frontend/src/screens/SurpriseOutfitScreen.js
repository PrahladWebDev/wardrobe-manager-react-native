import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated, Easing, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import Chip from '../components/Chip';
import { useTheme } from '../context/ThemeContext';
import { DRESS_CODES } from '../constants/dressCodes';

const OCCASIONS = [{ key: 'any', label: 'Any' }, ...DRESS_CODES];

const WEATHER_ICONS = {
  Clear: 'sunny-outline',
  Clouds: 'cloud-outline',
  Rain: 'rainy-outline',
  Thunderstorm: 'thunderstorm-outline',
  Drizzle: 'rainy-outline',
  Snow: 'snow-outline',
};

function Piece({ label, item, theme }) {
  const styles = makeStyles(theme);
  if (!item) return null;
  return (
    <View style={styles.pieceRow}>
      <View style={styles.pieceImg}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Ionicons name="shirt-outline" size={22} color={theme.colors.textFaint} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={theme.typography.label}>{label}</Text>
        <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
      </View>
    </View>
  );
}

export default function SurpriseOutfitScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [occasion, setOccasion] = useState('any');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(1)).current;

  const roll = useCallback(async (occ) => {
    setLoading(true);
    reveal.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => spin.setValue(0));
    try {
      let lat, lon;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch (_) {}

      const params = { lat, lon };
      if (occ && occ !== 'any') params.occasion = occ;
      const { data: res } = await api.get('/suggestion/surprise', { params });
      setData(res);
      Animated.timing(reveal, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    } catch (err) {
      Alert.alert('Could not shuffle', err.message);
    } finally {
      setLoading(false);
    }
  }, [spin, reveal]);

  useFocusEffect(useCallback(() => { roll(occasion); }, []));

  const selectedItems = data
    ? [data.outfit.top, data.outfit.bottom, data.outfit.shoes, data.outfit.outerwear, data.outfit.accessory].filter(Boolean)
    : [];

  const handleWearToday = async () => {
    if (!selectedItems.length) return;
    setBusy(true);
    try {
      await Promise.all(selectedItems.map((it) => api.post(`/items/${it._id}/wear`)));
      Alert.alert('Logged!', "Today's wear has been recorded for this outfit.");
    } catch (err) {
      Alert.alert('Error', err.message);
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

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={theme.typography.h1}>🎲 Surprise Me</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        A fresh, randomized outfit pulled from your closet — favoring pieces you haven't worn in a while.
      </Text>

      <FlatList
        data={OCCASIONS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(o) => o.key}
        style={{ marginBottom: 16, flexGrow: 0 }}
        renderItem={({ item: o }) => (
          <Chip
            label={o.label}
            active={occasion === o.key}
            onPress={() => { setOccasion(o.key); roll(o.key); }}
          />
        )}
      />

      {data?.weather && (
        <Card style={styles.weatherCard}>
          <Ionicons name={WEATHER_ICONS[data.weather.condition] || 'partly-sunny-outline'} size={28} color={theme.colors.accent} />
          <View style={{ marginLeft: 12 }}>
            <Text style={theme.typography.h3}>{Math.round(data.weather.tempC)}°C · {data.weather.condition}</Text>
            <Text style={theme.typography.bodyMuted}>Dressing for {data.targetSeason}</Text>
          </View>
        </Card>
      )}

      <Animated.View style={{ opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
        <Card style={{ marginTop: 14 }}>
          {selectedItems.length === 0 && !loading ? (
            <Text style={theme.typography.bodyMuted}>Not enough items in your closet yet to build a full outfit for this filter.</Text>
          ) : (
            <>
              <Piece label="TOP" item={data?.outfit?.top} theme={theme} />
              <Piece label="BOTTOM" item={data?.outfit?.bottom} theme={theme} />
              <Piece label="SHOES" item={data?.outfit?.shoes} theme={theme} />
              <Piece label="OUTERWEAR" item={data?.outfit?.outerwear} theme={theme} />
              <Piece label="ACCESSORY" item={data?.outfit?.accessory} theme={theme} />
            </>
          )}
        </Card>
      </Animated.View>

      {data?.missing?.length > 0 && (
        <Text style={[theme.typography.bodyMuted, { marginTop: 10, fontSize: 12 }]}>
          Missing: {data.missing.join(', ')} — add some to your closet for fuller surprises.
        </Text>
      )}

      {data?.rotation?.usedCooldown?.length > 0 && (
        <Text style={[theme.typography.bodyMuted, { marginTop: 10, fontSize: 12 }]}>
          Ran out of rested options for: {data.rotation.usedCooldown.join(', ')} — mixed in something recently worn.
        </Text>
      )}

      <Animated.View style={{ transform: [{ rotate: spinDeg }], alignSelf: 'center', marginTop: theme.spacing(6) }}>
        <Button title="🎲  Shuffle Again" onPress={() => roll(occasion)} loading={loading} style={{ paddingHorizontal: 32 }} />
      </Animated.View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button title="Wear This Today" variant="outline" onPress={handleWearToday} loading={busy} style={{ flex: 1 }} />
        <Button title="Save as Outfit" variant="ghost" onPress={handleSaveOutfit} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  weatherCard: { flexDirection: 'row', alignItems: 'center' },
  pieceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pieceImg: {
    width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden',
  },
});
