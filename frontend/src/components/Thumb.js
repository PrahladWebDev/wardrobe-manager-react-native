import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const CATEGORY_ICONS = {
  top: 'shirt-outline',
  bottom: 'body-outline',
  dress: 'woman-outline',
  outerwear: 'snow-outline',
  shoes: 'footsteps-outline',
  accessory: 'watch-outline',
  bag: 'bag-outline',
};

// One thumbnail implementation for every list row / collage / detail page:
// disk-cached, fades in, and shows a category glyph when there's no photo.
//
//   <Thumb uri={item.imageUrl} category={item.category} size={56} />
//   <Thumb uri={...} fill aspectRatio={3/4} />   // fills its parent width
export default function Thumb({ uri, category, size = 56, radius, fill = false, aspectRatio, style, iconSize, contentFit = 'cover', children }) {
  const theme = useTheme();
  const box = fill ? { width: '100%', aspectRatio: aspectRatio || 1 } : { width: size, height: size };
  return (
    <View style={[styles.wrap, box, { borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.surfaceAlt }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={200}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons name={CATEGORY_ICONS[category] || 'shirt-outline'} size={iconSize || Math.max(18, Math.round((fill ? 120 : size) * 0.4))} color={theme.colors.textFaint} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
