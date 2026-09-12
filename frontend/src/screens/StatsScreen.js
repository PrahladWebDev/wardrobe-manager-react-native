import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import Card from '../components/Card';
import BarChart from '../components/BarChart';
import LineChart from '../components/LineChart';
import Chip from '../components/Chip';
import { useTheme } from '../context/ThemeContext';

function StatBox({ value, label, theme }) {
  const styles = makeStyles(theme);
  return (
    <Card style={styles.statBox}>
      <Text style={theme.typography.h2}>{value}</Text>
      <Text style={theme.typography.label}>{label}</Text>
    </Card>
  );
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const COLOR_SWATCHES = {
  black: '#1a1a1a', white: '#f5f5f5', grey: '#9a9a9a', gray: '#9a9a9a',
  navy: '#1f2b4d', blue: '#3a5aE0', 'light blue': '#a9c6f5', denim: '#3f5a7d',
  red: '#c0392b', maroon: '#6e2430', pink: '#e58fb0', 'hot pink': '#ff3d8b',
  orange: '#e07b39', peach: '#f6c199', yellow: '#e8c93a', mustard: '#c9a227',
  green: '#3e8a5c', olive: '#6b6f2f', 'olive green': '#6b6f2f', teal: '#2f8f8a', mint: '#a6e3c4',
  purple: '#7a4fd6', lavender: '#c6b6f0', beige: '#d9c9a8', tan: '#c9a877',
  brown: '#6b4a33', khaki: '#c3b091', cream: '#f2e8d5', gold: '#c9a227', silver: '#c7c9cc',
  unspecified: '#b8b2a4',
};
const swatchFor = (name) => COLOR_SWATCHES[name] || '#b8b2a4';

export default function StatsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState(null);
  const [mostWorn, setMostWorn] = useState([]);
  const [costPerWear, setCostPerWear] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [insights, setInsights] = useState(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (days = rangeDays) => {
    setLoading(true);
    try {
      const [ov, mw, cpw, tl, ins] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/most-worn', { params: { limit: 5 } }),
        api.get('/stats/cost-per-wear', { params: { limit: 5, order: 'desc' } }),
        api.get('/stats/wear-timeline', { params: { days } }),
        api.get('/stats/insights'),
      ]);
      setOverview(ov.data);
      setMostWorn(mw.data.items);
      setCostPerWear(cpw.data.items);
      setTimeline(tl.data.timeline);
      setInsights(ins.data);
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
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 130 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(rangeDays)} tintColor={theme.colors.accent} />}
    >
      <Text style={[theme.typography.h1, { marginBottom: 16 }]}>Closet Stats</Text>

      <View style={styles.grid}>
        <StatBox value={overview?.totals?.totalItems ?? '—'} label="TOTAL ITEMS" theme={theme} />
        <StatBox value={`₹${overview?.totals?.totalValue ?? 0}`} label="CLOSET VALUE" theme={theme} />
        <StatBox value={overview?.totals?.totalWears ?? '—'} label="TOTAL WEARS" theme={theme} />
        <StatBox value={overview?.totals?.neverWornCount ?? '—'} label="NEVER WORN" theme={theme} />
      </View>

      <Card style={{ marginTop: 16 }}>
        <View style={styles.timelineHeader}>
          <Text style={theme.typography.h3}>Wear Activity</Text>
          <View style={{ flexDirection: 'row' }}>
            {RANGES.map((r) => (
              <Chip key={r.label} label={r.label} active={rangeDays === r.days} onPress={() => setRangeDays(r.days)} />
            ))}
          </View>
        </View>
        <LineChart points={timelinePoints} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>Most Worn</Text>
        {mostWorn.length === 0 ? (
          <Text style={theme.typography.bodyMuted}>Log a wear to see this fill up.</Text>
        ) : (
          <BarChart data={mostWorn.map((it) => ({ label: it.name, value: it.wearCount }))} valueFormatter={(v) => `${v}x`} />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 4 }]}>Highest Cost-Per-Wear</Text>
        <Text style={[theme.typography.bodyMuted, { marginBottom: 12 }]}>Wear these more to get your money's worth</Text>
        {costPerWear.length === 0 ? (
          <Text style={theme.typography.bodyMuted}>Add prices to your items to see this.</Text>
        ) : (
          <BarChart
            data={costPerWear.map((it) => ({ label: it.name, value: Math.round(it.costPerWear) }))}
            valueFormatter={(v) => `₹${v}`}
            barColor={theme.colors.danger}
          />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>By Category</Text>
        {(overview?.byCategory || []).map((c) => (
          <View key={c._id} style={styles.catRow}>
            <Text style={[theme.typography.body, { textTransform: 'capitalize' }]}>{c._id}</Text>
            <Text style={theme.typography.bodyMuted}>{c.count} items · ₹{c.value}</Text>
          </View>
        ))}
      </Card>

      <Text style={[theme.typography.h1, { marginTop: 24, marginBottom: 4 }]}>Wardrobe Insights</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        A closer look at what's actually getting worn.
      </Text>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.utilizationRing}>
            <Text style={theme.typography.h2}>{insights?.utilization?.rate ?? 0}%</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={theme.typography.h3}>Closet Utilization</Text>
            <Text style={theme.typography.bodyMuted}>
              {insights?.utilization?.wornRecently ?? 0} of {insights?.utilization?.totalItems ?? 0} items worn in the last 30 days
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 4 }]}>Least Worn</Text>
        <Text style={[theme.typography.bodyMuted, { marginBottom: 12 }]}>Give these another chance</Text>
        {(!insights?.leastWorn || insights.leastWorn.length === 0) ? (
          <Text style={theme.typography.bodyMuted}>Add a few items to see this.</Text>
        ) : (
          <BarChart
            data={insights.leastWorn.map((it) => ({ label: it.name, value: it.wearCount }))}
            valueFormatter={(v) => `${v}x`}
            barColor={theme.colors.info}
          />
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>By Color</Text>
        {(!insights?.byColor || insights.byColor.length === 0) ? (
          <Text style={theme.typography.bodyMuted}>Add colors to your items to see this.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {insights.byColor.map((c) => (
              <View key={c.color} style={styles.colorChip}>
                <View style={[styles.swatch, { backgroundColor: swatchFor(c.color) }]} />
                <Text style={[theme.typography.body, { textTransform: 'capitalize', marginLeft: 8 }]}>{c.color}</Text>
                <Text style={[theme.typography.bodyMuted, { marginLeft: 6 }]}>· {c.count}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>By Season</Text>
        {(insights?.bySeason || []).map((s) => (
          <View key={s.season} style={styles.catRow}>
            <Text style={[theme.typography.body, { textTransform: 'capitalize' }]}>{s.season}</Text>
            <Text style={theme.typography.bodyMuted}>{s.count} items</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: '47%', alignItems: 'center', paddingVertical: 18 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  utilizationRing: {
    width: 64, height: 64, borderRadius: theme.radius.pill,
    borderWidth: theme.border.width, borderColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft,
  },
  colorChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: theme.radius.pill, borderWidth: theme.border.width - 1, borderColor: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
  },
  swatch: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: theme.colors.text,
  },
});