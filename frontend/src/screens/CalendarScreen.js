import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Thumb from '../components/Thumb';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { mix } from '../utils/color';
import { localDateStr, parseLocalDate, deviceTimeZone } from '../utils/dates';

// Heatmap shading: soft accent for one wear, a mid tint for two, full accent
// for three or more. Derived from the active theme, so it works on all ten.
const getHeatColors = (theme) => ({
  1: theme.colors.accentSoft,
  2: mix(theme.colors.accentSoft, theme.colors.accent, 0.5),
  3: theme.colors.accent,
});
const heatBucket = (count) => (count >= 3 ? 3 : count);

function WornRow({ item, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Thumb uri={item.imageUrl} category={item.category} size={46} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={theme.typography.h4} numberOfLines={1}>{item.name}</Text>
        <Text style={[theme.typography.caption, { textTransform: 'capitalize' }]}>{item.category}</Text>
      </View>
    </View>
  );
}

// One WearLog entry: either a single item, or an outfit (rendered as its pieces).
function LogEntry({ log, theme }) {
  const styles = makeStyles(theme);
  if (log.outfit) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={styles.entryHeader}>
          <Ionicons name="albums-outline" size={16} color={theme.colors.accent} />
          <Text style={[theme.typography.label, { marginLeft: 6 }]}>OUTFIT · {log.outfit.name}</Text>
        </View>
        {(log.outfit.items || []).filter(Boolean).map((it) => <WornRow key={it._id} item={it} theme={theme} />)}
      </Card>
    );
  }
  if (log.item) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={styles.entryHeader}>
          <Ionicons name="shirt-outline" size={16} color={theme.colors.accent} />
          <Text style={[theme.typography.label, { marginLeft: 6 }]}>ITEM</Text>
        </View>
        <WornRow item={log.item} theme={theme} />
      </Card>
    );
  }
  return null;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const today = localDateStr();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const tz = deviceTimeZone();
  const HEAT = getHeatColors(theme);

  // Month heat data refetches only when the month changes; the day's logs only
  // when the selected date changes. No more double requests per tap.
  const calendar = useFocusedFetch(
    () => api.get('/stats/wear-calendar', { params: { month, tz } }).then((r) => r.data.days || []),
    [month]
  );
  const logs = useFocusedFetch(
    () => api.get('/stats/wear-on-date', { params: { date: selectedDate, tz } }).then((r) => r.data.logs || []),
    [selectedDate]
  );

  const markedDates = useMemo(() => {
    const marks = {};
    (calendar.data || []).forEach((d) => {
      const bucket = heatBucket(d.count);
      marks[d.date] = {
        customStyles: {
          container: { backgroundColor: HEAT[bucket], borderRadius: 8 },
          text: { color: bucket === 3 ? theme.colors.onAccent : theme.colors.text, fontWeight: '700' },
        },
      };
    });
    const existing = marks[selectedDate]?.customStyles;
    marks[selectedDate] = {
      customStyles: {
        container: { backgroundColor: existing?.container?.backgroundColor || theme.colors.accent, borderRadius: 8, borderWidth: 2, borderColor: theme.colors.text },
        text: existing?.text || { color: theme.colors.onAccent, fontWeight: '700' },
      },
    };
    return marks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar.data, selectedDate, theme]);

  const isToday = selectedDate === today;
  const selectedLabel = parseLocalDate(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const totalThisMonth = (calendar.data || []).reduce((s, d) => s + d.count, 0);

  return (
    <Screen
      title="Wear calendar"
      subtitle={calendar.status === 'ready' ? `${totalThisMonth} wear${totalThisMonth === 1 ? '' : 's'} logged this month` : undefined}
      scroll
      refreshing={calendar.refreshing || logs.refreshing}
      onRefresh={() => Promise.all([calendar.refresh(), logs.refresh()])}
    >
      <Card style={{ padding: 6 }}>
        <Calendar
          current={`${month}-01`}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          onMonthChange={(m) => setMonth(`${m.year}-${String(m.month).padStart(2, '0')}`)}
          markedDates={markedDates}
          markingType="custom"
          displayLoadingIndicator={calendar.status === 'loading'}
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            textSectionTitleColor: theme.colors.textMuted,
            selectedDayBackgroundColor: theme.colors.accent,
            selectedDayTextColor: theme.colors.onAccent,
            todayTextColor: theme.colors.accent,
            dayTextColor: theme.colors.text,
            textDisabledColor: theme.colors.textFaint,
            dotColor: theme.colors.accent,
            selectedDotColor: theme.colors.onAccent,
            arrowColor: theme.colors.accent,
            indicatorColor: theme.colors.accent,
            monthTextColor: theme.colors.text,
            textMonthFontWeight: '700',
            textDayFontWeight: '500',
          }}
        />
      </Card>

      <View style={styles.legendRow}>
        <Text style={theme.typography.small}>FEWER</Text>
        <View style={[styles.legendDot, { backgroundColor: HEAT[1] }]} />
        <View style={[styles.legendDot, { backgroundColor: HEAT[2] }]} />
        <View style={[styles.legendDot, { backgroundColor: HEAT[3] }]} />
        <Text style={theme.typography.small}>MORE WEARS</Text>
      </View>

      {calendar.status === 'error' && <ErrorState message={calendar.error} onRetry={calendar.reload} />}

      <Text style={[theme.typography.h2, { marginTop: theme.spacing(6), marginBottom: 12 }]}>
        {isToday ? 'Today' : selectedLabel}
      </Text>

      {logs.status === 'loading' && <SkeletonList count={2} thumb={46} />}
      {logs.status === 'error' && <ErrorState message={logs.error} onRetry={logs.reload} />}
      {logs.status === 'ready' && logs.data.length === 0 && (
        <EmptyState
          compact
          icon="calendar-outline"
          title="Nothing logged"
          subtitle={isToday ? 'Log a wear from an item or outfit and it shows up here.' : 'No items or outfits were marked as worn on this date.'}
        />
      )}
      {logs.status === 'ready' && logs.data.map((log) => <LogEntry key={log._id} log={log} theme={theme} />)}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4, marginHorizontal: 2, borderWidth: 1, borderColor: theme.colors.border },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
});
