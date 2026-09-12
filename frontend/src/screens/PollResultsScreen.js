import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, RefreshControl, Alert, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';

export default function PollResultsScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { id } = route.params;
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/polls/${id}`);
      setPoll(data.poll);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const closePoll = async () => {
    try {
      const { data } = await api.patch(`/polls/${id}/close`);
      setPoll(data.poll);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (!poll) return <View style={styles.container} />;

  const rawTotal = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const totalVotes = rawTotal || 1;
  const winner = [...poll.options].sort((a, b) => b.votes - a.votes)[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.accent} />}
    >
      <Text style={theme.typography.h1}>{poll.question}</Text>
      <Text style={[theme.typography.bodyMuted, { marginTop: 4, marginBottom: 20 }]}>
        Code {poll.code} · {rawTotal} votes{poll.isOpen ? '' : ' · closed'}
      </Text>

      {poll.options.map((opt) => {
        const pct = Math.round((opt.votes / totalVotes) * 100);
        const cover = opt.outfit?.items?.[0]?.imageUrl;
        const isWinning = opt._id === winner._id && opt.votes > 0;
        return (
          <Card key={opt._id} style={{ marginBottom: 12 }}>
            <View style={styles.row}>
              <View style={styles.thumb}>
                {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} /> : (
                  <Ionicons name="albums-outline" size={20} color={theme.colors.textFaint} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={theme.typography.h3}>{opt.label} {isWinning && '🏆'}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={theme.typography.bodyMuted}>{opt.votes} votes · {pct}%</Text>
              </View>
            </View>
          </Card>
        );
      })}

      <Button
        title="Share Poll Again"
        variant="outline"
        style={{ marginTop: theme.spacing(4) }}
        onPress={() => Share.share({ message: `Vote on my outfit! Open Wardrobe Manager → Polls → Enter Code: ${poll.code}` })}
      />
      {poll.isOpen && (
        <Button title="Close Poll" variant="danger" style={{ marginTop: 10 }} onPress={closePoll} />
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: {
    width: 56, height: 56, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden',
  },
  barTrack: { height: 8, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, marginTop: 6, marginBottom: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.accent, borderRadius: theme.radius.pill },
});
