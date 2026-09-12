import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
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
        <ActivityIndicator color={isPrimary ? theme.colors.onAccent : variant === 'danger' ? '#fff' : theme.colors.accent} />
      ) : (
        <Text
          style={[
            theme.typography.button,
            { color: isPrimary ? theme.colors.onAccent : variant === 'danger' ? '#fff' : theme.colors.accent },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: { backgroundColor: theme.colors.accent },
  outline: { backgroundColor: 'transparent', borderColor: theme.colors.text },
  ghost: { backgroundColor: theme.colors.accentSoft },
  danger: { backgroundColor: theme.colors.danger },
  disabled: { opacity: 0.5 },
});
