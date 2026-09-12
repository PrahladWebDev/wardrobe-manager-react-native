import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Card from '../components/Card';
import PillBadge from '../components/PillBadge';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const STATUS_META = {
  needs_repair: { label: 'Needs Repair', tone: 'danger' },
  in_progress: { label: 'In Progress', tone: 'info' },
  repaired: { label: 'Repaired', tone: 'success' },
};

function RepairRow({ item, navigation, theme, onAdvance }) {
  const styles = makeStyles(theme);
  const meta = STATUS_META[item.repair?.status] || STATUS_META.needs_repair;
  const nextAction = item.repair?.status === 'needs_repair' ? 'Start Repair' : item.repair?.status === 'in_progress' ? 'Mark Repaired' : null;

  return (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ItemDetail', { id: item._id })} activeOpacity={0.8}>
      <View style={styles.thumb}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Ionicons name="shirt-outline" size={22} color={theme.colors.textFaint} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <PillBadge label={meta.label} tone={meta.tone} />
          {item.repair?.cost > 0 && <Text style={theme.typography.bodyMuted}>₹{item.repair.cost}</Text>}
        </View>
        {item.repair?.notes ? (
          <Text style={[theme.typography.bodyMuted, { marginTop: 4 }]} numberOfLines={1}>{item.repair.notes}</Text>
        ) : null}
      </View>
      {nextAction && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onAdvance(item); }}
          style={styles.advanceBtn}
        >
          <Text style={styles.advanceText}>{nextAction}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function RepairTrackerScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [active, setActive] = useState([]);
  const [resolved, setResolved] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/items/repairs');
      setActive(data.active || []);
      setResolved(data.resolved || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const advance = async (item) => {
    const nextStatus = item.repair?.status === 'needs_repair' ? 'in_progress' : 'repaired';
    try {
      await api.put(`/items/${item._id}/repair`, { status: nextStatus });
      load();
    } catch (err) {
      console.warn(err.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.accent} />}
    >
      <Text style={[theme.typography.h1, { marginBottom: 4 }]}>🔧 Repair Tracker</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Damaged pieces are automatically kept out of Today's suggestions and Surprise Me until they're fixed.
      </Text>

      {active.length === 0 ? (
        <Card>
          <EmptyState icon="build-outline" title="Nothing in repair" subtitle="Flag a damaged item from its detail page to track it here" />
        </Card>
      ) : (
        active.map((item) => (
          <Card key={item._id} style={{ marginBottom: 12, padding: 0 }}>
            <RepairRow item={item} navigation={navigation} theme={theme} onAdvance={advance} />
          </Card>
        ))
      )}

      {resolved.length > 0 && (
        <>
          <Text style={[theme.typography.h2, { marginTop: 24, marginBottom: 12 }]}>Recently Fixed</Text>
          {resolved.map((item) => (
            <Card key={item._id} style={{ marginBottom: 12, padding: 0 }}>
              <RepairRow item={item} navigation={navigation} theme={theme} onAdvance={advance} />
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  thumb: {
    width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  advanceBtn: {
    borderWidth: theme.border.width - 1, borderColor: theme.colors.text,
    borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: theme.colors.accentSoft,
  },
  advanceText: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
});
