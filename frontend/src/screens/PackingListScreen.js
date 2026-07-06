import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Card from '../components/Card';
import { colors, radius, typography, spacing } from '../theme/colors';
import { scheduleTripReminder } from '../utils/notifications';

const OCCASIONS = ['casual', 'work', 'formal', 'travel', 'party'];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function Section({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{title} ({items.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((it) => (
          <View key={it._id} style={styles.piece}>
            <View style={styles.pieceImg}>
              {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={{ width: '100%', height: '100%' }} /> : (
                <Ionicons name="shirt-outline" size={20} color={colors.textFaint} />
              )}
            </View>
            <Text style={styles.pieceName} numberOfLines={1}>{it.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function PackingListScreen() {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(toISODate(today));
  const [endDate, setEndDate] = useState(toISODate(nextWeek));
  const [occasion, setOccasion] = useState('travel');
  const [remindMe, setRemindMe] = useState(true);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      let lat, lon;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
      const { data } = await api.post('/suggestion/packing', { startDate, endDate, occasion, lat, lon });
      setResult(data);

      if (remindMe) {
        const scheduled = await scheduleTripReminder(startDate, occasion);
        if (!scheduled) {
          Alert.alert('Heads up', 'Could not schedule a reminder (permission denied, or the trip already starts too soon).');
        }
      }
    } catch (err) {
      Alert.alert('Could not generate packing list', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[typography.bodyMuted, { marginBottom: 16 }]}>
        Tell us your trip dates and we'll pack for you based on the weather and what's clean in your closet.
      </Text>

      <Input label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-07-10" />
      <Input label="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-07-16" />

      <Text style={[typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>Occasion</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={o} active={occasion === o} onPress={() => setOccasion(o)} style={{ marginBottom: 8 }} />
        ))}
      </View>

      <TouchableOpacity style={styles.remindRow} onPress={() => setRemindMe((v) => !v)} activeOpacity={0.8}>
        <Ionicons name={remindMe ? 'checkbox' : 'square-outline'} size={20} color={remindMe ? colors.accent : colors.textFaint} />
        <Text style={[typography.bodyMuted, { marginLeft: 8 }]}>Remind me the evening before to pack</Text>
      </TouchableOpacity>

      <Button title="Generate Packing List" onPress={generate} loading={loading} />

      {result && (
        <Card style={{ marginTop: 20 }}>
          <Text style={[typography.h3, { marginBottom: 4 }]}>{result.days}-day trip</Text>
          <Text style={[typography.bodyMuted, { marginBottom: 16 }]}>
            Expect ~{Math.round(result.weather.tempC)}°C, {result.weather.condition} · packing for {result.targetSeason}
          </Text>
          <Section title="Tops" items={result.packingList.tops} />
          <Section title="Bottoms" items={result.packingList.bottoms} />
          <Section title="Shoes" items={result.packingList.shoes} />
          <Section title="Outerwear" items={result.packingList.outerwear} />
          <Section title="Accessories" items={result.packingList.accessories} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  remindRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  piece: { width: 80, marginRight: 10 },
  pieceImg: {
    width: 70, height: 70, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4, overflow: 'hidden',
  },
  pieceName: { fontSize: 11, color: colors.textMuted },
});
