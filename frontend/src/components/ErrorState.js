import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';

// Shown instead of an empty state when a request failed, so "offline" never
// looks like "you have nothing here".
export default function ErrorState({ title = 'Could not load', message = 'Something went wrong.', onRetry, icon = 'cloud-offline-outline', style }) {
  const theme = useTheme();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }, style]}>
      <Ionicons name={icon} size={40} color={theme.colors.textFaint} />
      <Text style={[theme.typography.h3, { marginTop: 12 }]}>{title}</Text>
      <Text style={[theme.typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} style={{ marginTop: 16, paddingHorizontal: 28 }} /> : null}
    </View>
  );
}
