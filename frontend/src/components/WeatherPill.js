import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PillBadge from './PillBadge';

export const WEATHER_ICONS = {
  Clear: 'sunny-outline',
  Clouds: 'cloud-outline',
  Rain: 'rainy-outline',
  Thunderstorm: 'thunderstorm-outline',
  Drizzle: 'rainy-outline',
  Snow: 'snow-outline',
  Mist: 'cloudy-outline',
  Haze: 'cloudy-outline',
  Fog: 'cloudy-outline',
};

export const weatherIcon = (condition) => WEATHER_ICONS[condition] || 'partly-sunny-outline';

// Compact weather summary used by Today, Surprise Me and Packing List.
// `onDark` renders it on top of the gradient hero.
export default function WeatherPill({ weather, targetSeason, onDark = false, style }) {
  const theme = useTheme();
  if (!weather) return null;
  const fg = onDark ? theme.colors.onAccent : theme.colors.text;
  const muted = onDark ? theme.colors.onAccent : theme.colors.textMuted;
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.iconWrap, { backgroundColor: onDark ? 'rgba(255,255,255,0.18)' : theme.colors.accentSoft, borderColor: onDark ? 'transparent' : theme.colors.text }]}>
        <Ionicons name={weatherIcon(weather.condition)} size={22} color={onDark ? fg : theme.colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.h3, { color: fg }]}>
          {Math.round(weather.tempC)}°C · {weather.condition}
        </Text>
        <Text style={[theme.typography.caption, { color: muted, opacity: onDark ? 0.85 : 1 }]}>
          {targetSeason ? `Dressing for ${targetSeason}` : ''}
          {weather.isRainy ? ' · bring a layer' : ''}
        </Text>
      </View>
      {weather.mocked ? <PillBadge label="Sample weather" tone="neutral" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2 },
});
