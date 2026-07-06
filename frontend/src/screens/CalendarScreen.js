import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { colors, radius, typography, spacing } from '../theme/colors';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Heatmap shading for the wear calendar — lighter accent for a single wear,
// full accent (with white text) for 3+ wears in a day.
const HEAT_COLORS = { 1: colors.accentSoft, 2: '#DE9E7E', 3: colors.accent };
const heatBucket = (count) => (count >= 3 ? 3 : count);

function WornRow({ item }) {
  return (
    <View style={styles.pieceRow}>
      <View style={styles.pieceImg}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Ionicons name="shirt-outline" size={20} color={colors.textFaint} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.h3} numberOfLines={1}>{item.name}</Text>
        <Text style={[typography.bodyMuted, { textTransform: 'capitalize' }]}>{item.category}</Text>
      </View>
    </View>
  );
}

// One WearLog entry: either a single item, or an outfit (rendered as its pieces).
function LogEntry({ log }) {
  if (log.outfit) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={styles.entryHeader}>
          <Ionicons name="albums-outline" size={16} color={colors.accent} />
          <Text style={[typography.label, { marginLeft: 6 }]}>OUTFIT · {log.outfit.name}</Text>
        </View>
        {(log.outfit.items || []).map((it) => <WornRow key={it._id} item={it} />)}
      </Card>
    );
  }
  if (log.item) {
    return (
      <Card style={{ marginBottom: 12 }}>
        <View style={styles.entryHeader}>
          <Ionicons name="shirt-outline" size={16} color={colors.accent} />
          <Text style={[typography.label, { marginLeft: 6 }]}>ITEM</Text>
        </View>
        <WornRow item={log.item} />
      </Card>
    );
  }
  return null;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [logs, setLogs] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadCalendar = useCallback(async (m) => {
    setLoadingCalendar(true);
    try {
      const { data } = await api.get('/stats/wear-calendar', { params: { month: m } });
      const marks = {};
      (data.days || []).forEach((d) => {
        const bucket = heatBucket(d.count);
        marks[d.date] = {
          customStyles: {
            container: { backgroundColor: HEAT_COLORS[bucket], borderRadius: 8 },
            text: { color: bucket === 3 ? '#fff' : colors.text, fontWeight: '700' },
          },
        };
      });
      setMarkedDates((prev) => ({
        ...marks,
        [selectedDate]: {
          ...(marks[selectedDate] || {}),
          customStyles: {
            container: { backgroundColor: colors.accent, borderRadius: 8, borderWidth: 2, borderColor: colors.text },
            text: { color: '#fff', fontWeight: '700' },
          },
        },
      }));
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoadingCalendar(false);
    }
  }, [selectedDate]);

  const loadLogsForDate = useCallback(async (date) => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get('/stats/wear-on-date', { params: { date } });
      setLogs(data.logs || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadCalendar(month);
    loadLogsForDate(selectedDate);
  }, [month, selectedDate, loadCalendar, loadLogsForDate]));

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setMarkedDates((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const { customStyles, ...rest } = prev[k];
        // Strip the previous selection border, keep the heatmap color if any.
        next[k] = customStyles ? { customStyles: { container: { ...customStyles.container, borderWidth: 0 }, text: customStyles.text } } : rest;
      });
      const existing = next[day.dateString]?.customStyles;
      next[day.dateString] = {
        customStyles: {
          container: { backgroundColor: existing?.container?.backgroundColor || colors.accent, borderRadius: 8, borderWidth: 2, borderColor: colors.text },
          text: existing?.text || { color: '#fff', fontWeight: '700' },
        },
      };
      return next;
    });
    loadLogsForDate(day.dateString);
  };

  const onMonthChange = (m) => {
    const nextMonth = `${m.year}-${String(m.month).padStart(2, '0')}`;
    setMonth(nextMonth);
    loadCalendar(nextMonth);
  };

  const isToday = selectedDate === todayStr();
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loadingCalendar} onRefresh={() => loadCalendar(month)} tintColor={colors.accent} />}
    >
      <Text style={[typography.h1, { marginBottom: 16 }]}>Wear Calendar</Text>

      <Card style={{ padding: 6 }}>
        <Calendar
          current={`${month}-01`}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          markedDates={markedDates}
          markingType="custom"
          theme={{
            backgroundColor: colors.surface,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.textMuted,
            selectedDayBackgroundColor: colors.accent,
            selectedDayTextColor: '#fff',
            todayTextColor: colors.accent,
            dayTextColor: colors.text,
            textDisabledColor: colors.textFaint,
            dotColor: colors.accent,
            selectedDotColor: '#fff',
            arrowColor: colors.accent,
            monthTextColor: colors.text,
            textMonthFontWeight: '700',
            textDayFontWeight: '500',
          }}
        />
      </Card>

      <View style={styles.legendRow}>
        <Text style={typography.label}>FEWER WEARS</Text>
        <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS[1] }]} />
        <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS[2] }]} />
        <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS[3] }]} />
        <Text style={typography.label}>MORE WEARS</Text>
      </View>

      <Text style={[typography.h3, { marginTop: spacing(6), marginBottom: 12 }]}>
        {isToday ? 'Today' : selectedLabel}
      </Text>

      {!loadingLogs && logs.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="Nothing logged"
          subtitle="No items or outfits were marked as worn on this date."
        />
      )}

      {logs.map((log) => <LogEntry key={log._id} log={log} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 4, marginHorizontal: 2 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pieceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pieceImg: {
    width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden',
  },
});