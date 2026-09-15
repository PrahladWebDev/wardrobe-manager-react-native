import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// variant: primary | outline | ghost | danger
// size: md (default) | sm
// icon: optional Ionicons name rendered before the title
export default function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading = false, disabled = false, style, textStyle, accessibilityLabel }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const fg = isPrimary || isDanger ? theme.colors.onAccent : theme.colors.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        size === 'sm' && styles.sm,
        isPrimary && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[theme.typography.button, size === 'sm' && { fontSize: 13 }, { color: fg }, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  base: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 14 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: theme.colors.accent },
  outline: { backgroundColor: 'transparent', borderColor: theme.colors.text },
  ghost: { backgroundColor: theme.colors.accentSoft },
  danger: { backgroundColor: theme.colors.danger },
  disabled: { opacity: 0.5 },
});
