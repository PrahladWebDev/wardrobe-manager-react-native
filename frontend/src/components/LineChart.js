import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Line } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { alpha } from '../utils/color';

// Wear-timeline line chart. Measures its own width with onLayout so it fits
// any card on any phone instead of a hardcoded 300px.
// points: [{ label: '07-01', value: 3 }, ...]
export default function LineChart({ points, height = 140 }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [width, setWidth] = useState(0);
  const padding = 14;

  if (!points || points.length === 0) {
    return (
      <View style={[styles.emptyWrap, { height }]}>
        <Text style={theme.typography.bodyMuted}>No wear activity logged yet in this period.</Text>
      </View>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const innerWidth = Math.max(0, width - padding * 2);
  const innerHeight = height - padding * 2;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + (points.length > 1 ? i * stepX : innerWidth / 2);
    const y = padding + innerHeight - (p.value / max) * innerHeight;
    return { x, y, value: p.value, label: p.label };
  });

  const baseline = padding + innerHeight;
  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${coords[0].x},${baseline} ${polylinePoints} ${coords[coords.length - 1].x},${baseline}`;
  const peak = coords.reduce((best, c) => (c.value > best.value ? c : best), coords[0]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Line x1={padding} y1={baseline} x2={padding + innerWidth} y2={baseline} stroke={theme.colors.border} strokeWidth={1} />
          <Polygon points={areaPoints} fill={alpha(theme.colors.accent, 0.12)} />
          <Polyline points={polylinePoints} fill="none" stroke={theme.colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={c === peak ? 5 : 3.5} fill={c === peak ? theme.colors.text : theme.colors.accent} />
          ))}
        </Svg>
      )}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{coords[0]?.label}</Text>
        <Text style={styles.axisLabel}>peak {peak.value} on {peak.label}</Text>
        <Text style={styles.axisLabel}>{coords[coords.length - 1]?.label}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  emptyWrap: { alignItems: 'center', justifyContent: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  axisLabel: { ...theme.typography.small, color: theme.colors.textFaint },
});
