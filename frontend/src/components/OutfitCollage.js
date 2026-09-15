import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Thumb, { CATEGORY_ICONS } from './Thumb';
import { useTheme } from '../context/ThemeContext';

// 2-column photo collage of an outfit's pieces. Used by Today, Surprise Me
// and Outfit Detail instead of three different 50px row implementations.
//
//   pieces: [{ label: 'Top', item, category: 'top' }, ...]
//   Missing items render a dashed "No top yet" tile so the state is obvious.
export default function OutfitCollage({ pieces = [], onPressPiece, tileAspect = 1, style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const visible = pieces.filter((p) => p && (p.item || p.showEmpty));
  if (!visible.length) return null;
  return (
    <View style={[styles.grid, style]}>
      {visible.map((p, i) => {
        const item = p.item;
        const tile = (
          <View style={styles.tile}>
            {item ? (
              <Thumb uri={item.imageUrl} category={item.category || p.category} fill aspectRatio={tileAspect} radius={theme.radius.md}>
                <View style={styles.caption}>
                  <Text style={styles.captionLabel}>{p.label}</Text>
                  <Text style={styles.captionName} numberOfLines={1}>{item.name}</Text>
                </View>
              </Thumb>
            ) : (
              <View style={[styles.empty, { aspectRatio: tileAspect }]}>
                <Ionicons name={CATEGORY_ICONS[p.category] || 'add-circle-outline'} size={26} color={theme.colors.textFaint} />
                <Text style={[theme.typography.caption, { marginTop: 6, textAlign: 'center' }]}>No {p.label.toLowerCase()} yet</Text>
              </View>
            )}
          </View>
        );
        return onPressPiece && item ? (
          <TouchableOpacity key={`${p.label}-${i}`} style={styles.cell} onPress={() => onPressPiece(item)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${p.label}: ${item.name}`}>
            {tile}
          </TouchableOpacity>
        ) : (
          <View key={`${p.label}-${i}`} style={styles.cell}>{tile}</View>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48.5%', marginBottom: 10 },
  tile: { width: '100%' },
  caption: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  captionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  captionName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  empty: {
    width: '100%', borderRadius: theme.radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', padding: 10,
  },
});
