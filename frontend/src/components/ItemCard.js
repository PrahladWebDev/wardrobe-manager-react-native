import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CATEGORY_ICONS = {
  top: 'shirt-outline',
  bottom: 'body-outline',
  dress: 'woman-outline',
  outerwear: 'snow-outline',
  shoes: 'footsteps-outline',
  accessory: 'watch-outline',
  bag: 'bag-outline',
};

export default function ItemCard({ item, onPress, selected, onToggleSelect }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <TouchableOpacity
      onPress={onToggleSelect ? onToggleSelect : onPress}
      activeOpacity={0.85}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name={CATEGORY_ICONS[item.category] || 'shirt-outline'} size={30} color={theme.colors.textFaint} />
          </View>
        )}
        {item.inLaundry && (
          <View style={styles.badge}>
            <Ionicons name="water-outline" size={12} color="#fff" />
          </View>
        )}
        {item.favorite && (
          <View style={[styles.badge, styles.favBadge]}>
            <Ionicons name="heart" size={12} color="#fff" />
          </View>
        )}
        {(item.repair?.status === 'needs_repair' || item.repair?.status === 'in_progress') && (
          <View style={[styles.badge, styles.repairBadge]}>
            <Ionicons name="build-outline" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.wearCount || 0} wear{item.wearCount === 1 ? '' : 's'}{item.inCooldown ? ' · resting' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    padding: 10,
    marginBottom: 14,
    ...theme.shadow.subtle,
  },
  selected: { borderColor: theme.colors.accent, borderWidth: theme.border.width + 1 },
  imageWrap: {
    width: '100%',
    height: 130,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 8,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: theme.colors.info,
    borderRadius: theme.radius.pill,
    padding: 4,
  },
  favBadge: { left: undefined, right: 6, backgroundColor: theme.colors.danger },
  repairBadge: { top: undefined, bottom: 6, backgroundColor: theme.colors.danger },
  name: { ...theme.typography.h3, fontSize: 14 },
  meta: { ...theme.typography.bodyMuted, fontSize: 12, marginTop: 2 },
});
