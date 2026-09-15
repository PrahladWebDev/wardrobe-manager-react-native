import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Value + label tile used by Stats, ItemDetail and the Wishlist summary.
export default function StatTile({ value, label, icon, tone = 'neutral', style, compact = false }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const bg = tone === 'accent' ? theme.colors.accentSoft : tone === 'danger' ? theme.colors.dangerSoft : tone === 'success' ? theme.colors.successSoft : theme.colors.surface;
  return (
    <View style={[styles.tile, compact && styles.compact, { backgroundColor: bg }, style]}>
      {icon ? (
        <View style={styles.iconRow}>
          <Ionicons name={icon} size={16} color={theme.colors.accent} />
        </View>
      ) : null}
      <Text style={[compact ? theme.typography.h3 : theme.typography.h2, { fontVariant: ['tabular-nums'] }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[theme.typography.label, { textTransform: 'uppercase', marginTop: 2 }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '30%',
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    paddingVertical: 16,
    paddingHorizontal: 14,
    ...theme.shadow.subtle,
  },
  compact: { paddingVertical: 12, paddingHorizontal: 12 },
  iconRow: { marginBottom: 6 },
});
