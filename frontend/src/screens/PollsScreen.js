import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

export default function PollsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/polls');
      setPolls(data.polls || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalVotes = (poll) => poll.options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <View style={styles.container}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Button title="New Poll" onPress={() => navigation.navigate('CreatePoll')} />
        <Button
          title="Enter a Poll Code to Vote"
          variant="outline"
          onPress={() => navigation.navigate('VotePoll')}
          style={{ marginTop: 10 }}
        />
      </View>

      <FlatList
        data={polls}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ padding: 20, paddingTop: theme.spacing(6) }}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PollResults', { id: item._id })}>
            <View style={{ flex: 1 }}>
              <Text style={theme.typography.h3} numberOfLines={1}>{item.question}</Text>
              <Text style={theme.typography.bodyMuted}>
                Code {item.code} · {item.options.length} outfits · {totalVotes(item)} votes{item.isOpen ? '' : ' · closed'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="albums-outline"
              title="No polls yet"
              subtitle="Create a poll to let friends vote on which outfit you should wear."
            />
          )
        }
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: 14, marginBottom: 12, ...theme.shadow.subtle,
  },
});
