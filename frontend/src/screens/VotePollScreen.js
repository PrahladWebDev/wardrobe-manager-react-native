import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors, radius, typography, spacing } from '../theme/colors';
import { getDeviceId } from '../utils/deviceId';

export default function VotePollScreen() {
  const [code, setCode] = useState('');
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState(null);

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/polls/code/${code.trim().toUpperCase()}`);
      setPoll(data.poll);
      setVotedOptionId(null);
    } catch (err) {
      Alert.alert('Poll not found', 'Double check the code and try again.');
      setPoll(null);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (optionId) => {
    setVoting(true);
    try {
      const deviceId = await getDeviceId();
      const { data } = await api.post(`/polls/code/${poll.code}/vote`, { optionId, deviceId });
      setPoll(data.poll);
      setVotedOptionId(optionId);
    } catch (err) {
      Alert.alert('Could not vote', err.message);
    } finally {
      setVoting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[typography.bodyMuted, { marginBottom: 16 }]}>
        Got a poll code from a friend? Enter it below to see the outfit options and vote.
      </Text>
      <Input label="Poll Code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="e.g. F7K2QX" autoCapitalize="characters" />
      <Button title="Find Poll" onPress={lookup} loading={loading} />

      {poll && (
        <View style={{ marginTop: spacing(6) }}>
          <Text style={typography.h2}>{poll.question}</Text>
          {!poll.isOpen && <Text style={[typography.bodyMuted, { marginBottom: 12 }]}>This poll is closed.</Text>}

          {poll.options.map((opt) => {
            const cover = opt.outfit?.items?.[0]?.imageUrl;
            const isVoted = votedOptionId === opt._id;
            return (
              <TouchableOpacity
                key={opt._id}
                activeOpacity={0.85}
                disabled={!poll.isOpen || voting || !!votedOptionId}
                onPress={() => vote(opt._id)}
              >
                <Card style={[styles.optionCard, isVoted && styles.optionVoted]}>
                  <View style={styles.thumb}>
                    {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} /> : (
                      <Ionicons name="albums-outline" size={22} color={colors.textFaint} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.h3}>{opt.label}</Text>
                    {votedOptionId && <Text style={typography.bodyMuted}>{opt.votes} votes</Text>}
                  </View>
                  {isVoted && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                </Card>
              </TouchableOpacity>
            );
          })}

          {votedOptionId && (
            <Text style={[typography.bodyMuted, { marginTop: 8 }]}>Thanks for voting! 🎉</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  optionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  optionVoted: { borderWidth: 2, borderColor: colors.success },
  thumb: {
    width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden',
  },
});
