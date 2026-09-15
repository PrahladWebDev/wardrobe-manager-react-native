import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// Selectable pill. Now a full 44px touch target, announces its selected
// state to screen readers, and gives a light haptic tick on selection.
export default function Chip({ label, active, onPress, icon, style, textStyle, small = false }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const color = active ? theme.colors.onAccent : theme.colors.textMuted;
  return (
    <TouchableOpacity
      onPress={() => { haptic.select(); onPress && onPress(); }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
      style={[styles.chip, small && styles.small, active && styles.active, style]}
    >
      <View style={styles.content}>
        {icon ? <Ionicons name={icon} size={14} color={color} style={{ marginRight: 6 }} /> : null}
        <Text style={[styles.text, small && { fontSize: 12 }, { color }, textStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    justifyContent: 'center',
  },
  small: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 4 },
  content: { flexDirection: 'row', alignItems: 'center' },
  active: { backgroundColor: theme.colors.accent },
  text: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});
