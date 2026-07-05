import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import Card from '../components/Card';
import BarChart from '../components/BarChart';
import LineChart from '../components/LineChart';
import Chip from '../components/Chip';
import { colors, typography } from '../theme/colors';

function StatBox({ value, label }) {
  return (
    <Card style={styles.statBox}>
      <Text style={typography.h2}>{value}</Text>
      <Text style={typography.label}>{label}</Text>
    </Card>
  );
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState(null);
  const [mostWorn, setMostWorn] = useState([]);
  const [costPerWear, setCostPerWear] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (days = rangeDays) => {
    setLoading(true);
    try {
      const [ov, mw, cpw, tl] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/most-worn', { params: { limit: 5 } }),
        api.get('/stats/cost-per-wear', { params: { limit: 5, order: 'desc' } }),
        api.get('/stats/wear-timeline', { params: { days } }),
      ]);
      setOverview(ov.data);
      setMostWorn(mw.data.items);
      setCostPerWear(cpw.data.items);
      setTimeline(tl.data.timeline);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useFocusEffect(useCallback(() => { load(rangeDays); }, [load, rangeDays]));

  const timelinePoints = timeline.map((t) => ({
    label: t._id.slice(5).replace('-', '/'),
    value: t.count,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(rangeDays)} tintColor={colors.accent} />}
    >
      <Text style={[typography.h1, { marginBottom: 16 }]}>Closet Stats</Text>

      <View style={styles.grid}>
        <StatBox value={overview?.totals?.totalItems ?? '—'} label="TOTAL ITEMS" />
        <StatBox value={`₹${overview?.totals?.totalValue ?? 0}`} label="CLOSET VALUE" />
        <StatBox value={overview?.totals?.totalWears ?? '—'} label="TOTAL WEARS" />
        <StatBox value={overview?.totals?.neverWornCount ?? '—'} label="NEVER WORN" />
      </View>

      <Card style={{ marginTop: 16 }}>
        <View style={styles.timelineHeader}>
          <Text style={typography.h3}>Wear Activity</Text>
          <View style={{ flexDirection: 'row' }}>
            {RANGES.map((r) => (
              <Chip key={r.label} label={r.label} active={rangeDays === r.days} onPress={() => setRangeDays(r.days)} />
            ))}
          </View>
        </View>
        <LineChart points={timelinePoints} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[typography.h3, { marginBottom: 12 }]}>Most Worn</Text>
        {mostWorn.length === 0 ? (
          <Text style={typography.bodyMuted}>Log a wear to see this fill up.</Text>
        ) : (
          <BarChart data={mostWorn.map((it) => ({ label: it.name, value: it.wearCount }))} valueFormatter={(v) => `${v}x`} />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[typography.h3, { marginBottom: 4 }]}>Highest Cost-Per-Wear</Text>
        <Text style={[typography.bodyMuted, { marginBottom: 12 }]}>Wear these more to get your money's worth</Text>
        {costPerWear.length === 0 ? (
          <Text style={typography.bodyMuted}>Add prices to your items to see this.</Text>
        ) : (
          <BarChart
            data={costPerWear.map((it) => ({ label: it.name, value: Math.round(it.costPerWear) }))}
            valueFormatter={(v) => `₹${v}`}
            barColor={colors.danger}
          />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[typography.h3, { marginBottom: 12 }]}>By Category</Text>
        {(overview?.byCategory || []).map((c) => (
          <View key={c._id} style={styles.catRow}>
            <Text style={[typography.body, { textTransform: 'capitalize' }]}>{c._id}</Text>
            <Text style={typography.bodyMuted}>{c.count} items · ₹{c.value}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47%', alignItems: 'center', paddingVertical: 18 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});