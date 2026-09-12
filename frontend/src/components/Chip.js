import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Chip({ label, active, onPress, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.active, style]}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
  },
  active: { backgroundColor: theme.colors.accent },
  text: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'capitalize' },
  activeText: { color: theme.colors.onAccent },
});
