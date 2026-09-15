import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Horizontal bar chart. Bars are plain Views with flex so the chart fills
// whatever width its Card gives it instead of a fixed 220px SVG that clipped
// on narrow phones.
export default function BarChart({ data, valueFormatter = (v) => `${v}`, barColor, height = 14 }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const resolvedBarColor = barColor || theme.colors.accent;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View accessibilityRole="summary">
      {data.map((d, idx) => {
        const widthPct = Math.max(3, Math.round((d.value / max) * 100));
        return (
          <View key={`${d.label}-${idx}`} style={styles.row} accessibilityLabel={`${d.label}: ${valueFormatter(d.value)}`}>
            <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
            <View style={[styles.track, { height }]}>
              <View style={[styles.fill, { width: `${widthPct}%`, height, backgroundColor: resolvedBarColor }]} />
            </View>
            <Text style={styles.value}>{valueFormatter(d.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { width: '30%', ...theme.typography.caption, paddingRight: 8 },
  track: { flex: 1, backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, overflow: 'hidden' },
  fill: { borderRadius: theme.radius.pill },
  value: { width: 54, fontSize: 12, fontWeight: '700', color: theme.colors.text, textAlign: 'right', marginLeft: 8, fontVariant: ['tabular-nums'] },
});
