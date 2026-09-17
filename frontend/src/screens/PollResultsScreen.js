import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Thumb from '../components/Thumb';
import PillBadge from '../components/PillBadge';
import ErrorState from '../components/ErrorState';
import { DetailSkeleton } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useFocusedFetch from '../hooks/useFocusedFetch';
import { haptic } from '../utils/haptics';

export default function PollResultsScreen({ route }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const { id } = route.params;
  const [closing, setClosing] = useState(false);

  const { data: poll, status, error, refreshing, refresh, reload, setData } = useFocusedFetch(
    () => api.get(`/polls/${id}`).then((r) => r.data.poll),
    [id]
  );

  const closePoll = () => {
    haptic.warning();
    Alert.alert('Close this poll?', 'Nobody will be able to vote after this. Results stay visible.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close poll', style: 'destructive',
        onPress: async () => {
          setClosing(true);
          try {
            const { data } = await api.patch(`/polls/${id}/close`);
            setData(data.poll);
            haptic.success();
            toast('Poll closed');
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  };

  const share = () => Share.share({ message: `Vote on my outfit! Open FoldD → Outfits → Polls → Enter code: ${poll.code}` });

  if (status === 'loading') return <Screen safeTop={false} tabInset={false} scroll><DetailSkeleton /></Screen>;
  if (status === 'error' || !poll) return <Screen safeTop={false} tabInset={false}><ErrorState message={error} onRetry={reload} /></Screen>;

  const rawTotal = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const totalVotes = rawTotal || 1;
  const winner = [...poll.options].sort((a, b) => b.votes - a.votes)[0];

  return (
    <Screen safeTop={false} tabInset={false} scroll refreshing={refreshing} onRefresh={refresh}>
      <Text style={theme.typography.h1}>{poll.question}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <PillBadge label={`Code ${poll.code}`} tone="accent" />
        <Text style={theme.typography.bodyMuted}>{rawTotal} vote{rawTotal === 1 ? '' : 's'}</Text>
        <PillBadge label={poll.isOpen ? 'Open' : 'Closed'} tone={poll.isOpen ? 'success' : 'neutral'} />
      </View>

      {poll.options.map((opt) => {
        const pct = Math.round((opt.votes / totalVotes) * 100);
        const cover = opt.outfit?.items?.[0]?.imageUrl;
        const isWinning = opt._id === winner._id && opt.votes > 0;
        return (
          <Card key={opt._id} style={[{ marginBottom: 12 }, isWinning && { borderColor: theme.colors.accent }]}>
            <View style={styles.row}>
              <Thumb uri={cover} category="top" size={56} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[theme.typography.h3, { flex: 1 }]} numberOfLines={1}>{opt.label}</Text>
                  {isWinning && <Ionicons name="trophy" size={18} color={theme.colors.accent} />}
                </View>
                <View style={styles.barTrack} accessibilityLabel={`${pct} percent`}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={theme.typography.caption}>{opt.votes} vote{opt.votes === 1 ? '' : 's'} · {pct}%</Text>
              </View>
            </View>
          </Card>
        );
      })}

      <Button title="Share poll code" icon="share-social-outline" variant="outline" style={{ marginTop: theme.spacing(4) }} onPress={share} />
      {poll.isOpen && (
        <Button title="Close poll" icon="lock-closed-outline" variant="danger" style={{ marginTop: 10 }} onPress={closePoll} loading={closing} />
      )}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  barTrack: { height: 10, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, marginTop: 6, marginBottom: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill },
});
