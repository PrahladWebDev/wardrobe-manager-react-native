import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import Thumb from '../components/Thumb';
import PillBadge from '../components/PillBadge';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';
import { getDeviceId } from '../utils/deviceId';

export default function VotePollScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(null);
  const [votedOptionId, setVotedOptionId] = useState(null);

  const lookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return setCodeError('Codes are 6 characters, like F7K2QX');
    setCodeError('');
    setLoading(true);
    try {
      const { data } = await api.get(`/polls/code/${trimmed}`);
      setPoll(data.poll);
      setVotedOptionId(null);
      haptic.light();
    } catch (err) {
      setPoll(null);
      setCodeError(err.status === 404 ? 'No poll with that code. Double-check it and try again.' : err.message);
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  const vote = async (optionId) => {
    setVoting(optionId);
    try {
      const deviceId = await getDeviceId();
      const { data } = await api.post(`/polls/code/${poll.code}/vote`, { optionId, deviceId });
      setPoll(data.poll);
      setVotedOptionId(optionId);
      haptic.success();
      toast('Thanks for voting!');
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setVoting(null);
    }
  };

  const total = poll ? poll.options.reduce((s, o) => s + o.votes, 0) : 0;

  return (
    <Screen safeTop={false} tabInset={false} scroll keyboard>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Got a poll code from a friend? Enter it to see their outfit options and vote.
      </Text>
      <Input
        label="Poll code"
        value={code}
        onChangeText={(t) => { setCode(t.toUpperCase()); if (codeError) setCodeError(''); }}
        placeholder="e.g. F7K2QX"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        leftIcon="keypad-outline"
        error={codeError}
        returnKeyType="search"
        onSubmitEditing={lookup}
        inputStyle={{ letterSpacing: 2, fontWeight: '700' }}
      />
      <Button title="Find poll" icon="search-outline" onPress={lookup} loading={loading} />

      {poll && (
        <View style={{ marginTop: theme.spacing(6) }}>
          <Text style={theme.typography.h2}>{poll.question}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 14 }}>
            <PillBadge label={poll.isOpen ? 'Open' : 'Closed'} tone={poll.isOpen ? 'success' : 'neutral'} />
            {votedOptionId ? <Text style={theme.typography.caption}>{total} vote{total === 1 ? '' : 's'} so far</Text> : null}
          </View>

          {poll.options.map((opt) => {
            const cover = opt.outfit?.items?.[0]?.imageUrl;
            const isVoted = votedOptionId === opt._id;
            const disabled = !poll.isOpen || !!voting || !!votedOptionId;
            return (
              <Card
                key={opt._id}
                style={[styles.optionCard, isVoted && styles.optionVoted, disabled && !isVoted && { opacity: 0.7 }]}
                onPress={disabled ? undefined : () => vote(opt._id)}
                accessibilityLabel={`Vote for ${opt.label}`}
              >
                <Thumb uri={cover} category="top" size={56} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={theme.typography.h3}>{opt.label}</Text>
                  {votedOptionId ? <Text style={theme.typography.caption}>{opt.votes} vote{opt.votes === 1 ? '' : 's'}</Text> : (
                    <Text style={theme.typography.caption}>{poll.isOpen ? 'Tap to vote' : 'Voting closed'}</Text>
                  )}
                </View>
                {isVoted ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                ) : voting === opt._id ? (
                  <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textFaint} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  optionCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12 },
  optionVoted: { borderColor: theme.colors.success, backgroundColor: theme.colors.successSoft },
});
