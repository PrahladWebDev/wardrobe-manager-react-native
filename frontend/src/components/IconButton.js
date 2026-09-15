import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// 44x44 icon-only button with hit slop and a required accessibility label.
// variant: 'plain' (just the icon), 'soft' (tinted disc), 'filled' (accent disc, used for "+").
export default function IconButton({ name, label, onPress, size = 22, color, variant = 'plain', disabled = false, style, haptics = true }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const iconColor = color || (variant === 'filled' ? theme.colors.onAccent : theme.colors.accent);
  return (
    <TouchableOpacity
      onPress={() => { if (haptics) haptic.select(); onPress && onPress(); }}
      disabled={disabled}
      hitSlop={theme.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
      style={[styles.base, variant === 'soft' && styles.soft, variant === 'filled' && styles.filled, disabled && { opacity: 0.4 }, style]}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  base: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill },
  soft: { backgroundColor: theme.colors.accentSoft, borderWidth: theme.border.width, borderColor: theme.colors.text },
  filled: { backgroundColor: theme.colors.accent, borderWidth: theme.border.width, borderColor: theme.colors.text },
});
