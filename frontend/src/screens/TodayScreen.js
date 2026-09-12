import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';

const WEATHER_ICONS = {
  Clear: 'sunny-outline',
  Clouds: 'cloud-outline',
  Rain: 'rainy-outline',
  Thunderstorm: 'thunderstorm-outline',
  Drizzle: 'rainy-outline',
  Snow: 'snow-outline',
};

function PieceRow({ label, item, theme }) {
  const styles = makeStyles(theme);
  if (!item) {
    return (
      <View style={styles.pieceRow}>
        <View style={styles.pieceImgEmpty}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.colors.textFaint} />
        </View>
        <View>
          <Text style={theme.typography.label}>{label}</Text>
          <Text style={theme.typography.bodyMuted}>Nothing available — add one!</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.pieceRow}>
      <View style={styles.pieceImg}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} /> : (
          <Ionicons name="shirt-outline" size={20} color={theme.colors.textFaint} />
        )}
      </View>
      <View>
        <Text style={theme.typography.label}>{label}</Text>
        <Text style={theme.typography.h3}>{item.name}</Text>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
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
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 130 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.accent} />}
    >
      <Text style={theme.typography.h1}>Today</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {locationDenied && (
        <Card style={{ marginBottom: 14, backgroundColor: theme.colors.infoSoft }}>
          <Text style={theme.typography.bodyMuted}>Location access is off — showing a default weather-based suggestion. Enable location for more accurate picks.</Text>
        </Card>
      )}

      {data && (
        <Card style={styles.weatherCard}>
          <Ionicons
            name={WEATHER_ICONS[data.weather.condition] || 'partly-sunny-outline'}
            size={32}
            color={theme.colors.accent}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={theme.typography.h2}>{Math.round(data.weather.tempC)}°C</Text>
            <Text style={theme.typography.bodyMuted}>{data.weather.condition} · dressing for {data.targetSeason}</Text>
          </View>
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>Suggested Outfit</Text>
        <PieceRow label="TOP" item={data?.suggestion?.top} theme={theme} />
        <PieceRow label="BOTTOM" item={data?.suggestion?.bottom} theme={theme} />
        <PieceRow label="SHOES" item={data?.suggestion?.shoes} theme={theme} />
        {data?.suggestion?.outerwear && <PieceRow label="OUTERWEAR" item={data.suggestion.outerwear} theme={theme} />}
      </Card>

      {data?.missing?.length > 0 && (
        <Text style={[theme.typography.bodyMuted, { marginTop: 10, fontSize: 12 }]}>
          Missing: {data.missing.join(', ')} for this weather — add some to get complete suggestions.
        </Text>
      )}

      {data?.rotation?.usedCooldown?.length > 0 && (
        <Text style={[theme.typography.bodyMuted, { marginTop: 10, fontSize: 12 }]}>
          Ran out of rested options for: {data.rotation.usedCooldown.join(', ')} — showing recently worn pieces instead.
        </Text>
      )}

      <Button title="Shuffle Suggestion" variant="outline" onPress={load} loading={loading} style={{ marginTop: theme.spacing(5) }} />
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
  pieceImgEmpty: {
    width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
});