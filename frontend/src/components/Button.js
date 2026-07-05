import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, typography } from '../theme/colors';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || variant === 'danger' ? '#fff' : colors.accent} />
      ) : (
        <Text
          style={[
            typography.button,
            { color: isPrimary || variant === 'danger' ? '#fff' : colors.accent },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: { backgroundColor: colors.accent },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
  ghost: { backgroundColor: colors.accentSoft },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
});
