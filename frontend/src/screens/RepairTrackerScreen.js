import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Thumb from '../components/Thumb';
import Button from '../components/Button';
import PillBadge from '../components/PillBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';

const STATUS_META = {
  needs_repair: { label: 'Needs repair', tone: 'danger' },
  in_progress: { label: 'In progress', tone: 'info' },
  repaired: { label: 'Repaired', tone: 'success' },
};

function RepairRow({ item, navigation, theme, onAdvance, advancing }) {
  const meta = STATUS_META[item.repair?.status] || STATUS_META.needs_repair;
  const nextAction = item.repair?.status === 'needs_repair' ? 'Start repair' : item.repair?.status === 'in_progress' ? 'Mark repaired' : null;

  return (
    <Card style={{ padding: 12, marginBottom: 12 }} onPress={() => navigation.navigate('ItemDetail', { id: item._id })} accessibilityLabel={`${item.name}, ${meta.label}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Thumb uri={item.imageUrl} category={item.category} size={52} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            <PillBadge label={meta.label} tone={meta.tone} />
            {item.repair?.cost > 0 && <Text style={theme.typography.caption}>₹{item.repair.cost}</Text>}
          </View>
          {item.repair?.notes ? (
            <Text style={[theme.typography.caption, { marginTop: 4 }]} numberOfLines={1}>{item.repair.notes}</Text>
          ) : null}
        </View>
      </View>
      {nextAction && (
        <Button title={nextAction} size="sm" variant="ghost" icon="arrow-forward-outline" onPress={() => onAdvance(item)} loading={advancing === item._id} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      )}
    </Card>
  );
}

export default function RepairTrackerScreen({ navigation }) {
  const theme = useTheme();
  const toast = useToast();
  const [advancing, setAdvancing] = useState(null);

  const { data, status, error, refreshing, refresh, reload } = useFocusedFetch(
    () => api.get('/items/repairs').then((r) => ({ active: r.data.active || [], resolved: r.data.resolved || [] })),
    []
  );

  const advance = async (item) => {
    const nextStatus = item.repair?.status === 'needs_repair' ? 'in_progress' : 'repaired';
    setAdvancing(item._id);
    try {
      await api.put(`/items/${item._id}/repair`, { status: nextStatus });
      haptic.success();
      toast(nextStatus === 'repaired' ? `${item.name} is back in rotation` : `Started repairing ${item.name}`);
      await refresh();
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setAdvancing(null);
    }
  };

  return (
    <Screen safeTop={false} tabInset={false} scroll refreshing={refreshing} onRefresh={refresh}>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Damaged pieces stay out of Today's suggestions and Surprise Me until they're fixed.
      </Text>

      {status === 'loading' && <SkeletonList count={3} thumb={52} />}
      {status === 'error' && <ErrorState message={error} onRetry={reload} />}

      {status === 'ready' && (
        <>
          {data.active.length === 0 ? (
            <Card>
              <EmptyState compact icon="build-outline" title="Nothing in repair" subtitle="Flag a damaged item from its detail page to track it here." />
            </Card>
          ) : (
            data.active.map((item) => (
              <RepairRow key={item._id} item={item} navigation={navigation} theme={theme} onAdvance={advance} advancing={advancing} />
            ))
          )}

          {data.resolved.length > 0 && (
            <>
              <Text style={[theme.typography.h2, { marginTop: 24, marginBottom: 12 }]}>Recently fixed</Text>
              {data.resolved.map((item) => (
                <RepairRow key={item._id} item={item} navigation={navigation} theme={theme} onAdvance={advance} advancing={advancing} />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({});
