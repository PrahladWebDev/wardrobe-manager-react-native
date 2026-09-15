import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Pulsing placeholder blocks shown while a screen's first request is in
// flight, so lists never flash "empty" and detail pages never render a bare
// background.

export function Skeleton({ width = '100%', height = 16, radius, style }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.surfaceAlt, opacity: pulse },
        style,
      ]}
    />
  );
}

export function ItemCardSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ width: '47%', marginBottom: 14, padding: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: theme.border.width, borderColor: theme.colors.border }}>
      <Skeleton height={undefined} style={{ aspectRatio: 3 / 4 }} radius={theme.radius.sm} />
      <Skeleton width="72%" height={13} style={{ marginTop: 10 }} />
      <Skeleton width="40%" height={11} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonGrid({ count = 6, style }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, style]}>
      {Array.from({ length: count }).map((_, i) => <ItemCardSkeleton key={i} />)}
    </View>
  );
}

export function RowSkeleton({ lines = 2, thumb = 56 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <Skeleton width={thumb} height={thumb} radius={14} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '62%' : '38%'} height={i === 0 ? 14 : 12} style={{ marginTop: i ? 6 : 0 }} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5, style, ...rowProps }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, i) => <RowSkeleton key={i} {...rowProps} />)}
    </View>
  );
}

export function StatSkeleton({ count = 4 }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width="47%" height={84} radius={theme.radius.lg} />
      ))}
    </View>
  );
}

export function DetailSkeleton() {
  const theme = useTheme();
  return (
    <View>
      <Skeleton height={260} radius={theme.radius.lg} />
      <Skeleton width="70%" height={26} style={{ marginTop: 16 }} />
      <Skeleton width="45%" height={14} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Skeleton height={74} radius={theme.radius.lg} style={{ flex: 1 }} />
        <Skeleton height={74} radius={theme.radius.lg} style={{ flex: 1 }} />
        <Skeleton height={74} radius={theme.radius.lg} style={{ flex: 1 }} />
      </View>
      <Skeleton height={48} radius={theme.radius.pill} style={{ marginTop: 20 }} />
      <Skeleton height={48} radius={theme.radius.pill} style={{ marginTop: 10 }} />
    </View>
  );
}
