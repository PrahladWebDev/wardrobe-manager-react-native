import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Input({ label, style, containerStyle, ...props }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textFaint}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { marginBottom: 14 },
  label: { ...theme.typography.label, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
});
