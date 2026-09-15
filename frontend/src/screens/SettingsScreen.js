import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import IconButton from '../components/IconButton';
import PillBadge from '../components/PillBadge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';

function ThemeSwatch({ option, active, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${option.name} theme`}
      style={{ alignItems: 'center', width: 74, minHeight: 44 }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: option.bg,
          borderWidth: active ? theme.border.width : 1.5,
          borderColor: active ? theme.colors.text : theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: option.accent }} />
        {active && (
          <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: option.accent, borderRadius: 10, padding: 2, borderWidth: 1.5, borderColor: theme.colors.text }}>
            <Ionicons name="checkmark" size={11} color={option.onAccent} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[theme.typography.small, active && { color: theme.colors.text }]}>{option.name}</Text>
    </TouchableOpacity>
  );
}

// Reachable from Profile -> Appearance & Settings, and from the Login screen's gear icon.
export default function SettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const { user, updateProfile } = useAuth();
  const [rotationDays, setRotationDays] = useState(user?.rotationDays ?? 5);
  const [savingRotation, setSavingRotation] = useState(false);

  const adjustRotation = async (delta) => {
    const prev = rotationDays;
    const next = Math.max(0, Math.min(30, rotationDays + delta));
    if (next === prev) return;
    setRotationDays(next);
    setSavingRotation(true);
    try {
      await updateProfile({ rotationDays: next });
      haptic.select();
    } catch (err) {
      setRotationDays(prev); // roll back the optimistic change
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setSavingRotation(false);
    }
  };

  return (
    <Screen safeTop={false} tabInset={false} scroll>
      <Text style={[theme.typography.h2, { marginBottom: 2 }]}>Appearance</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 14 }]}>Pick a look. It applies everywhere, instantly.</Text>

      <Card style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' }} accessibilityRole="radiogroup">
          {theme.themeList.map((option) => (
            <ThemeSwatch
              key={option.id}
              option={option}
              active={option.id === theme.themeId}
              onPress={() => { haptic.select(); theme.setTheme(option.id); }}
              theme={theme}
            />
          ))}
        </View>
      </Card>

      {user && (
        <>
          <Text style={[theme.typography.h2, { marginBottom: 2 }]}>Outfit rotation</Text>
          <Text style={[theme.typography.bodyMuted, { marginBottom: 14 }]}>
            Today and Surprise Me avoid re-offering anything you wore within this many days, when possible.
          </Text>
          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton name="remove" label="Fewer rest days" variant="soft" color={theme.colors.text} onPress={() => adjustRotation(-1)} disabled={savingRotation || rotationDays <= 0} />
            <View style={{ alignItems: 'center' }}>
              <Text style={theme.typography.h1}>{rotationDays === 0 ? 'Off' : rotationDays}</Text>
              <Text style={theme.typography.label}>{rotationDays === 0 ? 'NO ROTATION' : rotationDays === 1 ? 'DAY REST' : 'DAYS REST'}</Text>
              {savingRotation ? <PillBadge label="Saving…" tone="neutral" style={{ marginTop: 6 }} /> : null}
            </View>
            <IconButton name="add" label="More rest days" variant="soft" color={theme.colors.text} onPress={() => adjustRotation(1)} disabled={savingRotation || rotationDays >= 30} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const makeStyles = () => StyleSheet.create({});
