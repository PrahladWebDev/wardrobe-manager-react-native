import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, radius, typography } from '../theme/colors';

// A small, dependency-light horizontal bar chart rendered with react-native-svg
// (Expo Go compatible — no extra native config needed).
export default function BarChart({ data, valueFormatter = (v) => `${v}`, barColor = colors.accent, height = 26 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const chartWidth = 220;

  return (
    <View>
      {data.map((d, idx) => {
        const widthPct = Math.max(0.03, d.value / max);
        return (
          <View key={d.label + idx} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
            <Svg width={chartWidth} height={height}>
              <Rect x={0} y={height / 2 - 6} width={chartWidth} height={12} rx={6} fill={colors.surfaceAlt} />
              <Rect x={0} y={height / 2 - 6} width={chartWidth * widthPct} height={12} rx={6} fill={barColor} />
            </Svg>
            <Text style={styles.value}>{valueFormatter(d.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { width: 90, fontSize: 12, color: colors.textMuted },
  value: { width: 50, fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'right', marginLeft: 8 },
});
