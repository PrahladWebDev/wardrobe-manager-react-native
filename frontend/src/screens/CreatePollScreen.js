import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';

export default function CreatePollScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [outfits, setOutfits] = useState([]);
  const [selected, setSelected] = useState([]);
  const [question, setQuestion] = useState('Which outfit should I wear?');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/outfits').then(({ data }) => setOutfits(data.outfits || [])).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const create = async () => {
    if (selected.length < 2) return Alert.alert('Pick at least 2 outfits', 'Select two or more outfits to poll between.');
    setCreating(true);
    try {
      const { data } = await api.post('/polls', { question, outfitIds: selected });
      const code = data.poll.code;
      await Share.share({
        message: `Help me pick an outfit! Open the Wardrobe Manager app, go to Polls → Enter a Poll Code, and enter: ${code}`,
      });
      navigation.replace('PollResults', { id: data.poll._id });
    } catch (err) {
      Alert.alert('Could not create poll', err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <Input label="Question" value={question} onChangeText={setQuestion} placeholder="Which outfit should I wear?" />
        <Text style={theme.typography.label}>SELECT 2+ OUTFITS</Text>
      </View>
      <FlatList
        data={outfits}
        keyExtractor={(o) => o._id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 140 }}
        refreshing={loading}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item._id);
          const cover = item.items?.[0]?.imageUrl;
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggle(item._id)}
              activeOpacity={0.85}
            >
              <View style={styles.cardImg}>
                {cover ? <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} /> : (
                  <Ionicons name="albums-outline" size={24} color={theme.colors.textFaint} />
                )}
              </View>
              <Text style={theme.typography.h3} numberOfLines={1}>{item.name}</Text>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.footer}>
        <Button title={`Create Poll (${selected.length} selected)`} onPress={create} loading={creating} />
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  card: {
    flex: 1, margin: 6, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: 10, ...theme.shadow.subtle, borderWidth: 2, borderColor: 'transparent',
  },
  cardSelected: { borderColor: theme.colors.accent },
  cardImg: {
    width: '100%', height: 110, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden',
  },
  checkBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.pill, width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20,
    backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
});
