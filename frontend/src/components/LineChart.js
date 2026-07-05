import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, typography } from '../theme/colors';

// Simple wear-timeline line chart (react-native-svg, Expo Go compatible).
// points: [{ label: '07-01', value: 3 }, ...]
export default function LineChart({ points, height = 140 }) {
  const width = 300;
  const padding = 16;

  if (!points || points.length === 0) {
    return (
      <View style={[styles.emptyWrap, { height }]}>
        <Text style={typography.bodyMuted}>No wear activity logged yet in this period.</Text>
      </View>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = padding + innerHeight - (p.value / max) * innerHeight;
    return { x, y, value: p.value, label: p.label };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={padding} y1={padding + innerHeight} x2={padding + innerWidth} y2={padding + innerHeight} stroke={colors.border} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={colors.accent} />
        ))}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{coords[0]?.label}</Text>
        <Text style={styles.axisLabel}>{coords[coords.length - 1]?.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: 'center', justifyContent: 'center' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 4 },
  axisLabel: { fontSize: 11, color: colors.textFaint },
});
