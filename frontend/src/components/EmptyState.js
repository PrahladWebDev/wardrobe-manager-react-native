import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';

// Optional `action={{ label, onPress }}` renders a call-to-action button so an
// empty list tells the person what to do next instead of just that it's empty.
export default function EmptyState({ icon = 'shirt-outline', title, subtitle, action, compact = false, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={30} color={theme.colors.accent} />
      </View>
      <Text style={[theme.typography.h3, { marginTop: 14, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? <Text style={[theme.typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
      {action ? <Button title={action.label} onPress={action.onPress} style={{ marginTop: 18, paddingHorizontal: 26 }} /> : null}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 30 },
  compact: { paddingVertical: 24 },
  iconWrap: {
    width: 64, height: 64, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.border.width, borderColor: theme.colors.text, alignItems: 'center', justifyContent: 'center',
  },
});
