import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Card({ children, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    padding: 16,
    ...theme.shadow.card,
  },
});
