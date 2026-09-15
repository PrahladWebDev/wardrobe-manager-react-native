import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import WeatherPill from '../components/WeatherPill';
import OutfitCollage from '../components/OutfitCollage';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import PillBadge from '../components/PillBadge';
import { Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';
import { formatLongDate } from '../utils/dates';

async function getCoords(setDenied) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setDenied(true); return {}; }
    setDenied(false);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { lat: loc.coords.latitude, lon: loc.coords.longitude };
  } catch (_) {
    return {}; // location services off / timed out: fall back to the server's default weather
  }
}

function HeroSkeleton() {
  const theme = useTheme();
  return (
    <View>
      <Skeleton height={150} radius={theme.radius.lg} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Skeleton width="48.5%" height={160} radius={theme.radius.md} />
        <Skeleton width="48.5%" height={160} radius={theme.radius.md} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <Skeleton width="48.5%" height={160} radius={theme.radius.md} />
        <Skeleton width="48.5%" height={160} radius={theme.radius.md} />
      </View>
    </View>
  );
}

export default function TodayScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [locationDenied, setLocationDenied] = useState(false);
  const [logging, setLogging] = useState(false);

  const { data, status, error, refreshing, refresh, reload } = useFocusedFetch(async () => {
    const coords = await getCoords(setLocationDenied);
    const { data: res } = await api.get('/suggestion/today', { params: coords });
    return res;
  }, []);

  const suggestion = data?.suggestion || {};
  const pieces = [
    { label: 'Top', category: 'top', item: suggestion.top, showEmpty: true },
    { label: 'Bottom', category: 'bottom', item: suggestion.bottom, showEmpty: true },
    { label: 'Shoes', category: 'shoes', item: suggestion.shoes, showEmpty: true },
    { label: 'Outerwear', category: 'outerwear', item: suggestion.outerwear, showEmpty: false },
  ];
  const chosen = pieces.map((p) => p.item).filter(Boolean);
  const missing = data?.missing || [];

  const wearThis = async () => {
    if (!chosen.length) return;
    setLogging(true);
    try {
      await Promise.all(chosen.map((it) => api.post(`/items/${it._id}/wear`)));
      haptic.success();
      toast(`Logged today's outfit (${chosen.length} piece${chosen.length === 1 ? '' : 's'})`);
      refresh();
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setLogging(false);
    }
  };

  const openPiece = (item) => navigation.navigate('WardrobeTab', { screen: 'ItemDetail', params: { id: item._id }, initial: false });

  return (
    <Screen scroll refreshing={refreshing} onRefresh={refresh}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.heroEyebrow}>TODAY</Text>
        <Text style={styles.heroDate}>{formatLongDate()}</Text>
        {status === 'ready' && data?.weather ? (
          <WeatherPill weather={data.weather} targetSeason={data.targetSeason} onDark style={{ marginTop: 14 }} />
        ) : (
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton width={44} height={44} radius={22} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <Skeleton width={140} height={16} style={{ marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </View>
        )}
      </LinearGradient>

      {locationDenied && (
        <View style={styles.notice}>
          <Ionicons name="location-outline" size={16} color={theme.colors.info} />
          <Text style={[theme.typography.caption, { marginLeft: 8, flex: 1 }]}>Location is off, so this uses default weather. Enable it for sharper picks.</Text>
        </View>
      )}

      {status === 'loading' && <HeroSkeleton />}

      {status === 'error' && <ErrorState message={error} onRetry={reload} />}

      {status === 'ready' && (
        <>
          <View style={styles.sectionHead}>
            <Text style={theme.typography.h2}>Suggested outfit</Text>
            {data?.rotation?.days > 0 && <PillBadge label={`${data.rotation.days}-day rotation`} tone="accent" />}
          </View>

          {chosen.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon="shirt-outline"
                title="Not enough to build a look"
                subtitle="Add at least a top, a bottom and shoes for this weather."
                action={{ label: 'Add an item', onPress: () => navigation.navigate('WardrobeTab', { screen: 'AddItem', initial: false }) }}
              />
            </Card>
          ) : (
            <OutfitCollage pieces={pieces} onPressPiece={openPiece} tileAspect={0.9} />
          )}

          {missing.length > 0 && chosen.length > 0 && (
            <View style={styles.notice}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
              <Text style={[theme.typography.caption, { marginLeft: 8, flex: 1 }]}>
                Missing {missing.join(', ')} for this weather. Add some for complete looks.
              </Text>
            </View>
          )}

          {data?.rotation?.usedCooldown?.length > 0 && (
            <Text style={[theme.typography.caption, { marginTop: 8 }]}>
              Ran out of rested {data.rotation.usedCooldown.join(', ')}, so a recently worn piece is included.
            </Text>
          )}

          <View style={styles.actions}>
            <Button title="Wear this" icon="checkmark-done-outline" onPress={wearThis} loading={logging} disabled={!chosen.length} style={{ flex: 1 }} />
            <Button
              title="Surprise me"
              icon="dice-outline"
              variant="outline"
              onPress={() => navigation.navigate('OutfitsTab', { screen: 'SurpriseOutfit', initial: false })}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  hero: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    padding: 20,
    marginBottom: 16,
    ...theme.shadow.card,
  },
  heroEyebrow: { ...theme.typography.small, color: theme.colors.onAccent, opacity: 0.85, letterSpacing: 1.2 },
  heroDate: { ...theme.typography.display, fontSize: 28, color: theme.colors.onAccent, marginTop: 2 },
  notice: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: theme.spacing(4) },
});
