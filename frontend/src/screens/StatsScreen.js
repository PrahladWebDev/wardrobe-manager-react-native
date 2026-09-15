import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import BarChart from '../components/BarChart';
import LineChart from '../components/LineChart';
import Chip from '../components/Chip';
import StatTile from '../components/StatTile';
import RingProgress from '../components/RingProgress';
import ItemCard from '../components/ItemCard';
import ErrorState from '../components/ErrorState';
import { StatSkeleton, Skeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';
import { swatchFor } from '../constants/colors';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const formatMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function Segmented({ value, onChange, options }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => { haptic.select(); onChange(o.key); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text style={[theme.typography.button, { fontSize: 14, color: active ? theme.colors.onAccent : theme.colors.textMuted }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function StatsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState('overview');
  const [rangeDays, setRangeDays] = useState(30);

  const summary = useFocusedFetch(async () => {
    const [ov, mw, cpw, ins] = await Promise.all([
      api.get('/stats/overview'),
      api.get('/stats/most-worn', { params: { limit: 5 } }),
      api.get('/stats/cost-per-wear', { params: { limit: 5, order: 'desc' } }),
      api.get('/stats/insights'),
    ]);
    return { overview: ov.data, mostWorn: mw.data.items || [], costPerWear: cpw.data.items || [], insights: ins.data };
  }, []);

  // The timeline is the only thing that depends on the range, so it fetches alone.
  const timeline = useFocusedFetch(
    () => api.get('/stats/wear-timeline', { params: { days: rangeDays } }).then((r) => r.data.timeline || []),
    [rangeDays]
  );

  const refresh = async () => { await Promise.all([summary.refresh(), timeline.refresh()]); };
  const overview = summary.data?.overview;
  const insights = summary.data?.insights;
  const timelinePoints = (timeline.data || []).map((t) => ({ label: t._id.slice(5).replace('-', '/'), value: t.count }));

  const openItem = (item) => navigation.navigate('WardrobeTab', { screen: 'ItemDetail', params: { id: item._id }, initial: false });

  return (
    <Screen title="Closet stats" subtitle="What you own, and what you actually wear" scroll refreshing={summary.refreshing || timeline.refreshing} onRefresh={refresh}>
      <Segmented value={tab} onChange={setTab} options={[{ key: 'overview', label: 'Overview' }, { key: 'insights', label: 'Insights' }]} />

      {summary.status === 'loading' && (
        <View style={{ marginTop: 16 }}>
          <StatSkeleton />
          <Skeleton height={200} radius={theme.radius.lg} style={{ marginTop: 16 }} />
          <Skeleton height={180} radius={theme.radius.lg} style={{ marginTop: 16 }} />
        </View>
      )}

      {summary.status === 'error' && <ErrorState message={summary.error} onRetry={summary.reload} />}

      {summary.status === 'ready' && tab === 'overview' && (
        <>
          <View style={styles.grid}>
            <StatTile value={overview?.totals?.totalItems ?? 0} label="Items" icon="shirt-outline" />
            <StatTile value={formatMoney(overview?.totals?.totalValue)} label="Closet value" icon="pricetag-outline" />
          </View>
          <View style={styles.grid}>
            <StatTile value={overview?.totals?.totalWears ?? 0} label="Total wears" icon="checkmark-done-outline" />
            <StatTile value={overview?.totals?.neverWornCount ?? 0} label="Never worn" icon="moon-outline" tone={overview?.totals?.neverWornCount ? 'danger' : 'neutral'} />
          </View>

          <Card style={{ marginTop: 6 }}>
            <View style={styles.timelineHeader}>
              <Text style={theme.typography.h3}>Wear activity</Text>
              <View style={{ flexDirection: 'row' }}>
                {RANGES.map((r) => (
                  <Chip key={r.label} label={r.label} small active={rangeDays === r.days} onPress={() => setRangeDays(r.days)} style={{ marginRight: 6 }} />
                ))}
              </View>
            </View>
            {timeline.status === 'loading' ? <Skeleton height={140} /> : <LineChart points={timelinePoints} />}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Text style={[theme.typography.h3, { marginBottom: 12 }]}>Most worn</Text>
            {summary.data.mostWorn.length === 0 ? (
              <Text style={theme.typography.bodyMuted}>Log a wear to see this fill up.</Text>
            ) : (
              <BarChart data={summary.data.mostWorn.map((it) => ({ label: it.name, value: it.wearCount }))} valueFormatter={(v) => `${v}x`} />
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Text style={[theme.typography.h3, { marginBottom: 2 }]}>Highest cost per wear</Text>
            <Text style={[theme.typography.caption, { marginBottom: 12 }]}>Wear these more to get your money's worth</Text>
            {summary.data.costPerWear.length === 0 ? (
              <Text style={theme.typography.bodyMuted}>Add prices to your items to see this.</Text>
            ) : (
              <BarChart
                data={summary.data.costPerWear.map((it) => ({ label: it.name, value: Math.round(it.costPerWear) }))}
                valueFormatter={(v) => formatMoney(v)}
                barColor={theme.colors.danger}
              />
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Text style={[theme.typography.h3, { marginBottom: 8 }]}>By category</Text>
            {(overview?.byCategory || []).map((c, i, arr) => (
              <View key={c._id} style={[styles.catRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[theme.typography.body, { textTransform: 'capitalize' }]}>{c._id}</Text>
                <Text style={theme.typography.bodyMuted}>{c.count} item{c.count === 1 ? '' : 's'} · {formatMoney(c.value)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {summary.status === 'ready' && tab === 'insights' && (
        <>
          <Card style={{ marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RingProgress value={insights?.utilization?.rate ?? 0} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={theme.typography.h3}>Closet utilization</Text>
                <Text style={theme.typography.bodyMuted}>
                  {insights?.utilization?.wornRecently ?? 0} of {insights?.utilization?.totalItems ?? 0} items worn in the last 30 days
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ marginTop: 20 }}>
            <Text style={[theme.typography.h3, { marginBottom: 2 }]}>Least worn</Text>
            <Text style={[theme.typography.caption, { marginBottom: 12 }]}>Give these another chance this week</Text>
            {(!insights?.leastWorn || insights.leastWorn.length === 0) ? (
              <Text style={theme.typography.bodyMuted}>Add a few items to see this.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                {insights.leastWorn.map((it) => (
                  <ItemCard key={it._id} item={it} onPress={() => openItem(it)} style={{ width: 150, marginRight: 12 }} />
                ))}
              </ScrollView>
            )}
          </View>

          <Card style={{ marginTop: 8 }}>
            <Text style={[theme.typography.h3, { marginBottom: 12 }]}>By color</Text>
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
            <Text style={[theme.typography.h3, { marginBottom: 8 }]}>By season</Text>
            {(insights?.bySeason || []).map((s, i, arr) => (
              <View key={s.season} style={[styles.catRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[theme.typography.body, { textTransform: 'capitalize' }]}>{s.season}</Text>
                <Text style={theme.typography.bodyMuted}>{s.count} item{s.count === 1 ? '' : 's'}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  segment: {
    flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill,
    borderWidth: theme.border.width, borderColor: theme.colors.text, padding: 4, marginBottom: 16,
  },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  segmentActive: { backgroundColor: theme.colors.accent },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  colorChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: theme.radius.pill, borderWidth: theme.border.width - 1, borderColor: theme.colors.text,
    backgroundColor: theme.colors.surfaceAlt,
  },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: theme.colors.text },
});
