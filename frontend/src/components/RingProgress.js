import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Animated percentage ring (0-100). Used for closet utilization on Stats.
export default function RingProgress({ value = 0, size = 84, stroke = 9, label, color }) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    Animated.timing(progress, { toValue: pct, duration: 700, useNativeDriver: false }).start();
  }, [pct, progress]);

  const dashOffset = progress.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color || theme.colors.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      <Text style={[theme.typography.h2, { fontVariant: ['tabular-nums'] }]}>{Math.round(pct)}%</Text>
      {label ? <Text style={theme.typography.small}>{label}</Text> : null}
    </View>
  );
}
