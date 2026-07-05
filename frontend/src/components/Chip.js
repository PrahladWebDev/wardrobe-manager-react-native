import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/colors';

export default function Chip({ label, active, onPress, style }) {
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

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  active: { backgroundColor: colors.text, borderColor: colors.text },
  text: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'capitalize' },
  activeText: { color: '#fff' },
});
