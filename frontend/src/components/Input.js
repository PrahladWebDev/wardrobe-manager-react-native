import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Text input with label, inline error/helper text, optional leading icon and
// a trailing slot (used for the password eye). `secureToggle` adds the eye
// automatically for password fields.
export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightSlot,
  secureToggle = false,
  secureTextEntry,
  style,
  containerStyle,
  inputStyle,
  multiline,
  ...props
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const secure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, multiline && styles.multiline, error && styles.fieldError, style]}>
        {leftIcon ? <Ionicons name={leftIcon} size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          placeholderTextColor={theme.colors.textFaint}
          secureTextEntry={secure}
          multiline={multiline}
          accessibilityLabel={label}
          style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }, inputStyle]}
          {...props}
        />
        {secureToggle ? (
          <TouchableOpacity
            onPress={() => setHidden((v) => !v)}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : rightSlot}
      </View>
      {error ? (
        <Text style={[theme.typography.caption, { color: theme.colors.danger, marginTop: 4 }]} accessibilityLiveRegion="polite">{error}</Text>
      ) : helperText ? (
        <Text style={[theme.typography.caption, { marginTop: 4 }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { marginBottom: 14 },
  label: { ...theme.typography.label, marginBottom: 6, textTransform: 'uppercase' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
  },
  multiline: { alignItems: 'flex-start' },
  fieldError: { borderColor: theme.colors.danger },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.text,
  },
});
