import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../api/client';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Card from '../components/Card';
import Field from '../components/Field';
import Thumb from '../components/Thumb';
import DateField from '../components/DateField';
import WeatherPill from '../components/WeatherPill';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';
import { localDateStr, addDays, isISODate, parseLocalDate } from '../utils/dates';
import { scheduleTripReminder } from '../utils/notifications';
import { DRESS_CODES } from '../constants/dressCodes';

function Section({ title, items, theme }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[theme.typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{title} · {items.length}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((it) => (
          <View key={it._id} style={{ width: 84, marginRight: 10 }}>
            <Thumb uri={it.imageUrl} category={it.category} size={84} radius={theme.radius.md} style={{ marginBottom: 4 }} />
            <Text style={theme.typography.small} numberOfLines={1}>{it.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function PackingListScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const today = new Date();

  const [startDate, setStartDate] = useState(localDateStr(today));
  const [endDate, setEndDate] = useState(localDateStr(addDays(today, 6)));
  const [dateError, setDateError] = useState('');
  const [occasion, setOccasion] = useState('travel');
  const [remindMe, setRemindMe] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // Restore the last generated packing list (if any) so it doesn't disappear
  // when you leave this screen and come back.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/suggestion/packing/latest');
        if (data) {
          setResult(data);
          if (isISODate(data.startDate)) setStartDate(data.startDate);
          if (isISODate(data.endDate)) setEndDate(data.endDate);
          if (data.occasion) setOccasion(data.occasion);
        }
      } catch (_) {
        // No saved list yet, or failed to load — fine, just start fresh.
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const hasAnyItems = result && Object.values(result.packingList || {}).some((arr) => arr && arr.length > 0);
  const tripDays = isISODate(startDate) && isISODate(endDate)
    ? Math.max(1, Math.round((parseLocalDate(endDate) - parseLocalDate(startDate)) / 86400000) + 1)
    : null;

  const generate = async () => {
    if (!isISODate(startDate) || !isISODate(endDate)) return setDateError('Pick both dates.');
    if (endDate < startDate) return setDateError('The end date is before the start date.');
    setDateError('');
    setLoading(true);
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
      const { data } = await api.post('/suggestion/packing', { startDate, endDate, occasion, lat, lon });
      setResult(data);
      haptic.success();
      toast(`Packed for ${data.days} day${data.days === 1 ? '' : 's'}`);

      if (remindMe) {
        const scheduled = await scheduleTripReminder(startDate, occasion);
        if (!scheduled) toast('Reminder not set: notifications are off or the trip starts too soon', 'info');
      }
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen safeTop={false} tabInset={false} scroll keyboard>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Pick your trip dates and Foldd packs from what's clean in your closet, based on the forecast.
      </Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <DateField label="Start" value={startDate} onChange={(d) => { setStartDate(d); if (endDate < d) setEndDate(d); setDateError(''); }} style={{ flex: 1 }} />
        <DateField label="End" value={endDate} onChange={(d) => { setEndDate(d); setDateError(''); }} minimumDate={parseLocalDate(startDate)} style={{ flex: 1 }} />
      </View>
      {dateError ? <Text style={[theme.typography.caption, { color: theme.colors.danger, marginTop: -8, marginBottom: 10 }]}>{dateError}</Text> : null}
      {tripDays && !dateError ? <Text style={[theme.typography.caption, { marginTop: -6, marginBottom: 10 }]}>{tripDays}-day trip</Text> : null}

      <Field label="Occasion">
        {DRESS_CODES.map((d) => (
          <Chip key={d.key} label={d.label} small icon={d.icon} active={occasion === d.key} onPress={() => setOccasion(d.key)} style={{ marginBottom: 8 }} />
        ))}
      </Field>

      <TouchableOpacity
        style={styles.remindRow}
        onPress={() => setRemindMe((v) => !v)}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: remindMe }}
        accessibilityLabel="Remind me the evening before to pack"
      >
        <Ionicons name={remindMe ? 'checkbox' : 'square-outline'} size={22} color={remindMe ? theme.colors.accent : theme.colors.textFaint} />
        <Text style={[theme.typography.bodyMuted, { marginLeft: 8 }]}>Remind me the evening before to pack</Text>
      </TouchableOpacity>

      <Button title="Generate packing list" icon="briefcase-outline" onPress={generate} loading={loading} />

      {restoring && <Skeleton height={180} radius={theme.radius.lg} style={{ marginTop: 20 }} />}

      {!restoring && result && (
        <Card style={{ marginTop: 20 }}>
          <Text style={[theme.typography.h2, { marginBottom: 8 }]}>{result.days}-day trip</Text>
          <WeatherPill weather={result.weather} targetSeason={result.targetSeason} style={{ marginBottom: 16 }} />

          {hasAnyItems ? (
            <>
              <Section title="Tops" items={result.packingList.tops} theme={theme} />
              <Section title="Bottoms" items={result.packingList.bottoms} theme={theme} />
              <Section title="Shoes" items={result.packingList.shoes} theme={theme} />
              <Section title="Outerwear" items={result.packingList.outerwear} theme={theme} />
              <Section title="Accessories" items={result.packingList.accessories} theme={theme} />
            </>
          ) : (
            <EmptyState
              compact
              icon="shirt-outline"
              title="Nothing matched this trip"
              subtitle={`Your items may not be tagged "${result.occasion || occasion}", may not suit this season, or are in the laundry.`}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const makeStyles = () => StyleSheet.create({
  remindRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 12 },
});
