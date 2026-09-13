import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import FadeInUp from './FadeInUp';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HANGER_PATH =
  'M46,8 C42,4 36,6 38,12 C40,17 46,15 47,10 L47,20 L12,52 C6,57 10,66 18,66 L82,66 C90,66 94,57 88,52 L53,20 L53,10';
const HANGER_LENGTH = 260;

const SPARKS = [
  { cx: 18, cy: 16, r: 3 },
  { cx: 82, cy: 14, r: 2.4 },
  { cx: 66, cy: 3, r: 2 },
  { cx: 28, cy: 2, r: 2 },
];

// Pulsing mark + hand-drawn hanger doodle + wordmark, used at the top of
// both the Login and Register screens. The hanger line draws itself on,
// then the little "spark" dots pop in — the mark keeps a slow idle pulse.
export default function AuthHero({ title, subtitle }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const draw = useRef(new Animated.Value(0)).current;
  const sparks = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(draw, {
        toValue: 1,
        duration: 950,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(sparks, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const strokeDashoffset = draw.interpolate({ inputRange: [0, 1], outputRange: [HANGER_LENGTH, 0] });
  const markScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={styles.wrap}>
      <FadeInUp delay={0} distance={10}>
        <View style={styles.markRow}>
          <Animated.View style={[styles.markGlow, { opacity: glowOpacity, transform: [{ scale: markScale }] }]} />
          <Animated.View style={[styles.mark, { transform: [{ scale: markScale }] }]}>
            <Ionicons name="shirt" size={18} color={theme.colors.onAccent} />
          </Animated.View>
          <Text style={styles.wordmark}>FOLDD</Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={80} distance={14}>
        <View style={styles.illustrationWrap}>
          <Svg width={140} height={110} viewBox="0 0 100 76">
            <AnimatedPath
              d={HANGER_PATH}
              stroke={theme.colors.textMuted}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={HANGER_LENGTH}
              strokeDashoffset={strokeDashoffset}
            />
            {SPARKS.map((s, i) => (
              <AnimatedCircle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={theme.colors.accent}
                opacity={sparks}
              />
            ))}
          </Svg>
        </View>
      </FadeInUp>

      <FadeInUp delay={160} distance={16}>
        <Text style={styles.title}>{title}</Text>
      </FadeInUp>

      {subtitle ? (
        <FadeInUp delay={220} distance={16}>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </FadeInUp>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', marginBottom: theme.spacing(6) },
    markRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing(2) },
    markGlow: {
      position: 'absolute',
      left: -6,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.accentSoft,
    },
    mark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    wordmark: { ...theme.typography.h3, letterSpacing: 2, color: theme.colors.text },
    illustrationWrap: { marginBottom: theme.spacing(3) },
    title: { ...theme.typography.display, textAlign: 'center' },
    subtitle: { ...theme.typography.bodyMuted, textAlign: 'center', marginTop: theme.spacing(2), maxWidth: 260 },
  });
