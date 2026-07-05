import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors, radius, typography, spacing, shadow } from '../theme/colors';

const WEATHER_ICONS = {
  Clear: 'sunny-outline',
  Clouds: 'cloud-outline',
  Rain: 'rainy-outline',
  Thunderstorm: 'thunderstorm-outline',
  Drizzle: 'rainy-outline',
  Snow: 'snow-outline',
};

function PieceRow({ label, item }) {
  if (!item) {
    return (
      <View style={styles.pieceRow}>
        <View style={styles.pieceImgEmpty}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.textFaint} />
        </View>
        <View>
          <Text style={typography.label}>{label}</Text>
          <Text style={typography.bodyMuted}>Nothing available — add one!</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.pieceRow}>
      <View style={styles.pieceImg}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} /> : (
          <Ionicons name="shirt-outline" size={20} color={colors.textFaint} />
        )}
      </View>
      <View>
        <Text style={typography.label}>{label}</Text>
        <Text style={typography.h3}>{item.name}</Text>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let lat, lon;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        setLocationDenied(false);
      } else {
        setLocationDenied(true);
      }
      const { data: res } = await api.get('/suggestion/today', { params: { lat, lon } });
      setData(res);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      <Text style={typography.h1}>Today</Text>
      <Text style={[typography.bodyMuted, { marginBottom: 16 }]}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {locationDenied && (
        <Card style={{ marginBottom: 14, backgroundColor: colors.infoSoft }}>
          <Text style={typography.bodyMuted}>Location access is off — showing a default weather-based suggestion. Enable location for more accurate picks.</Text>
        </Card>
      )}

      {data && (
        <Card style={styles.weatherCard}>
          <Ionicons
            name={WEATHER_ICONS[data.weather.condition] || 'partly-sunny-outline'}
            size={32}
            color={colors.accent}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={typography.h2}>{Math.round(data.weather.tempC)}°C</Text>
            <Text style={typography.bodyMuted}>{data.weather.condition} · dressing for {data.targetSeason}</Text>
          </View>
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <Text style={[typography.h3, { marginBottom: 12 }]}>Suggested Outfit</Text>
        <PieceRow label="TOP" item={data?.suggestion?.top} />
        <PieceRow label="BOTTOM" item={data?.suggestion?.bottom} />
        <PieceRow label="SHOES" item={data?.suggestion?.shoes} />
        {data?.suggestion?.outerwear && <PieceRow label="OUTERWEAR" item={data.suggestion.outerwear} />}
      </Card>

      {data?.missing?.length > 0 && (
        <Text style={[typography.bodyMuted, { marginTop: 10, fontSize: 12 }]}>
          Missing: {data.missing.join(', ')} for this weather — add some to get complete suggestions.
        </Text>
      )}

      <Button title="Shuffle Suggestion" variant="outline" onPress={load} loading={loading} style={{ marginTop: spacing(5) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  weatherCard: { flexDirection: 'row', alignItems: 'center' },
  pieceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  pieceImg: {
    width: 50, height: 50, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden',
  },
  pieceImgEmpty: {
    width: 50, height: 50, borderRadius: radius.sm, backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
});