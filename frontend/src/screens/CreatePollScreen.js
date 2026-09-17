import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Screen from '../components/Screen';
import Input from '../components/Input';
import Button from '../components/Button';
import Thumb from '../components/Thumb';
import Field from '../components/Field';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import StickyFooter, { FOOTER_SPACE } from '../components/StickyFooter';
import { SkeletonGrid } from '../components/Skeleton';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';

export default function CreatePollScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const [outfits, setOutfits] = useState([]);
  const [selected, setSelected] = useState([]);
  const [question, setQuestion] = useState('Which outfit should I wear?');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setStatus('loading');
    api.get('/outfits', { params: { limit: 100 } })
      .then(({ data }) => { setOutfits(data.outfits || []); setStatus('ready'); })
      .catch((err) => { setError(err.message); setStatus('error'); });
  };
  useEffect(load, []);

  const toggle = (id) => {
    haptic.select();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = async () => {
    if (selected.length < 2) return toast('Pick at least two outfits to poll between', 'info');
    setCreating(true);
    try {
      const { data } = await api.post('/polls', { question: question.trim() || 'Which outfit should I wear?', outfitIds: selected });
      haptic.success();
      await Share.share({ message: `Help me pick an outfit! Open FoldD → Outfits → Polls → Enter a code, and enter: ${data.poll.code}` });
      navigation.replace('PollResults', { id: data.poll._id });
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen
      safeTop={false}
      tabInset={false}
      padded={false}
      keyboard
      footer={
        <StickyFooter>
          <Button title={selected.length >= 2 ? `Create poll with ${selected.length} outfits` : 'Pick at least 2 outfits'} onPress={create} loading={creating} disabled={selected.length < 2} />
        </StickyFooter>
      }
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Input label="Question" value={question} onChangeText={setQuestion} placeholder="Which outfit should I wear?" returnKeyType="done" />
        <Field label={`Select 2+ outfits · ${selected.length} selected`} row={false} style={{ marginBottom: 4 }} />
      </View>

      {status === 'loading' && <SkeletonGrid count={4} style={{ paddingHorizontal: 20 }} />}
      {status === 'error' && <ErrorState message={error} onRetry={load} />}
      {status === 'ready' && (
        <FlatList
          data={outfits}
          keyExtractor={(o) => o._id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingBottom: FOOTER_SPACE, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selected.includes(item._id);
            const cover = (item.items || []).find(Boolean)?.imageUrl;
            return (
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(item._id)}
                activeOpacity={0.85}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.name}
              >
                <Thumb uri={cover} category="top" fill aspectRatio={1} radius={theme.radius.md} style={{ marginBottom: 8 }}>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} />
                    </View>
                  )}
                </Thumb>
                <Text style={theme.typography.h4} numberOfLines={1}>{item.name}</Text>
                <Text style={theme.typography.caption}>{(item.items || []).length} pieces</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState icon="albums-outline" title="No outfits to poll with" subtitle="Create at least two outfits first." action={{ label: 'Create an outfit', onPress: () => navigation.replace('CreateOutfit') }} />
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, marginBottom: 14,
    padding: 10, ...theme.shadow.subtle, borderWidth: theme.border.width, borderColor: theme.colors.text,
  },
  cardSelected: { borderColor: theme.colors.accent, borderWidth: theme.border.width + 1 },
  checkBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: theme.colors.accent, borderWidth: 1.5, borderColor: theme.colors.surface,
    borderRadius: theme.radius.pill, width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
});
