import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const ACTIONS = [
  { key: 'addItem', label: 'Add Clothing Item', icon: 'shirt-outline', go: { tab: 'WardrobeTab', screen: 'AddItem' } },
  { key: 'createOutfit', label: 'Create Outfit', icon: 'albums-outline', go: { tab: 'OutfitsTab', screen: 'CreateOutfit' } },
  { key: 'surprise', label: 'Surprise Me', icon: 'dice-outline', go: { tab: 'OutfitsTab', screen: 'SurpriseOutfit' } },
  { key: 'today', label: "Today's Suggestion", icon: 'sunny-outline', go: { tab: 'Today' } },
  { key: 'repairs', label: 'Repair Tracker', icon: 'build-outline', go: { tab: 'WardrobeTab', screen: 'RepairTracker' } },
  { key: 'wishlist', label: 'Add to Wishlist', icon: 'bag-handle-outline', go: { tab: 'WardrobeTab', screen: 'WishlistForm' } },
];

// Sits above the tab bar on every main-tab screen. Tapping opens a lightweight
// sheet of quick actions rather than assuming a single "add" target, since
// this app has several distinct create flows (item / outfit / shuffle).
export default function Fab({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const go = (action) => {
    setOpen(false);
    const { tab, screen } = action.go;
    if (screen) {
      navigation.navigate('Main', { screen: tab, params: { screen } });
    } else {
      navigation.navigate('Main', { screen: tab });
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={[styles.fab, { bottom: 74 + insets.bottom }]}
      >
        <Ionicons name="add" size={28} color={theme.colors.onAccent} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { marginBottom: insets.bottom + 24 }]}>
            <Text style={[theme.typography.h2, { marginBottom: 14 }]}>Quick Add</Text>
            {ACTIONS.map((a) => (
              <TouchableOpacity key={a.key} style={styles.row} onPress={() => go(a)} activeOpacity={0.7}>
                <View style={styles.rowIcon}>
                  <Ionicons name={a.icon} size={18} color={theme.colors.accent} />
                </View>
                <Text style={theme.typography.body}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
