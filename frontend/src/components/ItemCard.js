import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Thumb from './Thumb';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// Grid card for a clothing item. 3:4 photo (matches the capture aspect in
// AddItem), status badges, press-scale feedback, and an optional long-press
// hook for quick actions.
export default function ItemCard({ item, onPress, onLongPress, selected, onToggleSelect, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  const needsRepair = item.repair?.status === 'needs_repair' || item.repair?.status === 'in_progress';
  const wears = item.wearCount || 0;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onToggleSelect ? onToggleSelect : onPress}
        onLongPress={onLongPress ? () => { haptic.medium(); onLongPress(item); } : undefined}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${wears} wear${wears === 1 ? '' : 's'}${item.inLaundry ? ', in laundry' : ''}${item.favorite ? ', favorite' : ''}`}
        accessibilityState={{ selected: !!selected }}
        style={[styles.card, selected && styles.selected]}
      >
        <Thumb uri={item.imageUrl} category={item.category} fill aspectRatio={3 / 4} radius={theme.radius.sm} style={styles.imageWrap}>
          {item.inLaundry && (
            <View style={[styles.badge, styles.laundryBadge]}>
              <Ionicons name="water" size={12} color={theme.colors.onAccent} />
            </View>
          )}
          {item.favorite && (
            <View style={[styles.badge, styles.favBadge]}>
              <Ionicons name="heart" size={12} color="#FFFFFF" />
            </View>
          )}
          {needsRepair && (
            <View style={[styles.badge, styles.repairBadge]}>
              <Ionicons name="build" size={12} color="#FFFFFF" />
            </View>
          )}
          {selected && (
            <View style={styles.check}>
              <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} />
            </View>
          )}
        </Thumb>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {wears} wear{wears === 1 ? '' : 's'}{item.inCooldown ? ' · resting' : ''}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  wrap: { width: '47%', marginBottom: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    padding: 10,
    ...theme.shadow.subtle,
  },
  selected: { borderColor: theme.colors.accent, borderWidth: theme.border.width + 1 },
  imageWrap: { marginBottom: 8 },
  badge: {
    position: 'absolute',
    borderRadius: theme.radius.pill,
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.colors.surface,
  },
  laundryBadge: { top: 6, left: 6, backgroundColor: theme.colors.info },
  favBadge: { top: 6, right: 6, backgroundColor: theme.colors.danger },
  repairBadge: { bottom: 6, left: 6, backgroundColor: theme.colors.danger },
  check: {
    position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.accent, borderWidth: 1.5, borderColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...theme.typography.h4, fontSize: 14 },
  meta: { ...theme.typography.caption, marginTop: 2 },
});
