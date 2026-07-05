import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography, shadow } from '../theme/colors';

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
            <Ionicons name={CATEGORY_ICONS[item.category] || 'shirt-outline'} size={30} color={colors.textFaint} />
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
      </View>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.wearCount || 0} wear{item.wearCount === 1 ? '' : 's'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 14,
    ...shadow.subtle,
  },
  selected: { borderWidth: 2, borderColor: colors.accent },
  imageWrap: {
    width: '100%',
    height: 130,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    marginBottom: 8,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.info,
    borderRadius: radius.pill,
    padding: 4,
  },
  favBadge: { left: undefined, right: 6, backgroundColor: colors.danger },
  name: { ...typography.h3, fontSize: 14 },
  meta: { ...typography.bodyMuted, fontSize: 12, marginTop: 2 },
});
