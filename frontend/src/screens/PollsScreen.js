import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import PillBadge from '../components/PillBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonList } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import useFocusedFetch from '../hooks/useFocusedFetch';

export default function PollsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { data: polls, status, error, refreshing, refresh, reload } = useFocusedFetch(
    () => api.get('/polls').then((r) => r.data.polls || []),
    []
  );

  const totalVotes = (poll) => poll.options.reduce((sum, o) => sum + o.votes, 0);

  const renderEmpty = () => {
    if (status === 'loading') return <SkeletonList count={3} thumb={44} style={{ paddingHorizontal: 20 }} />;
    if (status === 'error') return <ErrorState message={error} onRetry={reload} />;
    return (
      <EmptyState
        icon="people-outline"
        title="No polls yet"
        subtitle="Pick two or more outfits and let friends vote on which you should wear."
        action={{ label: 'Create a poll', onPress: () => navigation.navigate('CreatePoll') }}
      />
    );
  };

  return (
    <Screen safeTop={false} tabInset={false} padded={false}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Button title="New poll" icon="add" onPress={() => navigation.navigate('CreatePoll')} style={{ flex: 1 }} />
        <Button title="Enter a code" icon="keypad-outline" variant="outline" onPress={() => navigation.navigate('VotePoll')} style={{ flex: 1 }} />
      </View>

      <FlatList
        data={status === 'ready' ? polls : []}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accent} colors={[theme.colors.accent]} />}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigation.navigate('PollResults', { id: item._id })} accessibilityLabel={`${item.question}, ${totalVotes(item)} votes`}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={theme.typography.h3} numberOfLines={1}>{item.question}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Text style={theme.typography.caption}>{item.options.length} outfits · {totalVotes(item)} votes</Text>
                <PillBadge label={item.isOpen ? 'Open' : 'Closed'} tone={item.isOpen ? 'success' : 'neutral'} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textFaint} />
          </Card>
        )}
        ListEmptyComponent={renderEmpty()}
      />
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12, ...theme.shadow.subtle },
  codeBox: {
    paddingHorizontal: 10, minHeight: 44, borderRadius: theme.radius.sm, backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.border.width - 1, borderColor: theme.colors.text, alignItems: 'center', justifyContent: 'center',
  },
  codeText: { ...theme.typography.small, fontSize: 13, color: theme.colors.text, letterSpacing: 1.5 },
});
