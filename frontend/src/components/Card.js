import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Surface with the app's outline. Pass `onPress` to make the whole card a
// button with a proper pressed state and accessibility role.
export default function Card({ children, style, onPress, onLongPress, accessibilityLabel }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.card, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
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
