import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function ThemeSwatch({ option, active, onPress, mutedColor }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ alignItems: 'center', width: 74 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: option.bg,
          borderWidth: active ? 2.5 : 1,
          borderColor: active ? option.accent : 'rgba(0,0,0,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: option.accent }} />
        {active && (
          <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: option.accent, borderRadius: 10, padding: 2 }}>
            <Ionicons name="checkmark" size={11} color={option.mode === 'dark' ? '#000' : '#fff'} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: mutedColor }}>{option.name}</Text>
    </TouchableOpacity>
  );
}

// Reachable from Profile -> Appearance & Settings.
export default function SettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, updateProfile } = useAuth();
  const [rotationDays, setRotationDays] = useState(user?.rotationDays ?? 5);
  const [savingRotation, setSavingRotation] = useState(false);

  const adjustRotation = async (delta) => {
    const next = Math.max(0, Math.min(30, rotationDays + delta));
    setRotationDays(next);
    setSavingRotation(true);
    try {
      await updateProfile({ rotationDays: next });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingRotation(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[theme.typography.h1, { marginBottom: 4 }]}>Appearance</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Pick a look for the app. Applies everywhere, instantly.
      </Text>

      <Card style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'flex-start' }}>
          {theme.themeList.map((option) => (
            <ThemeSwatch
              key={option.id}
              option={option}
              active={option.id === theme.themeId}
              onPress={() => theme.setTheme(option.id)}
              mutedColor={theme.colors.textMuted}
            />
          ))}
        </View>
      </Card>

      {user && (
        <>
          <Text style={[theme.typography.h1, { marginBottom: 4 }]}>Outfit Rotation</Text>
          <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
            Suggestions and "Surprise Me" will avoid re-offering something you wore within this many days, when possible.
          </Text>
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => adjustRotation(-1)}
              disabled={savingRotation || rotationDays <= 0}
              style={[styles.stepperBtn, (savingRotation || rotationDays <= 0) && { opacity: 0.4 }]}
            >
              <Ionicons name="remove" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={theme.typography.h1}>{rotationDays === 0 ? 'Off' : rotationDays}</Text>
              <Text style={theme.typography.label}>{rotationDays === 0 ? 'NO ROTATION' : rotationDays === 1 ? 'DAY REST' : 'DAYS REST'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjustRotation(1)}
              disabled={savingRotation || rotationDays >= 30}
              style={[styles.stepperBtn, (savingRotation || rotationDays >= 30) && { opacity: 0.4 }]}
            >
              <Ionicons name="add" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  stepperBtn: {
    width: 40, height: 40, borderRadius: theme.radius.pill,
    borderWidth: theme.border.width, borderColor: theme.colors.text,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
});
