import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionSheet from './ActionSheet';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// Quick-add button floating above the tab bar. Every create flow in the app
// is one tap away from here, which also gives Polls and Packing a permanent
// entry point instead of burying them in header icons and the Profile menu.
const ACTIONS = [
  { key: 'addItem', label: 'Add clothing item', icon: 'shirt-outline', go: { tab: 'WardrobeTab', screen: 'AddItem' } },
  { key: 'createOutfit', label: 'Create outfit', icon: 'albums-outline', go: { tab: 'OutfitsTab', screen: 'CreateOutfit' } },
  { key: 'surprise', label: 'Surprise me', icon: 'dice-outline', subtitle: 'Shuffle a fresh outfit', go: { tab: 'OutfitsTab', screen: 'SurpriseOutfit' } },
  { key: 'poll', label: 'Start an outfit poll', icon: 'people-outline', subtitle: 'Let friends vote', go: { tab: 'OutfitsTab', screen: 'CreatePoll' } },
  { key: 'wishlist', label: 'Add to wishlist', icon: 'bag-handle-outline', go: { tab: 'WardrobeTab', screen: 'WishlistForm' } },
  { key: 'packing', label: 'Plan a packing list', icon: 'briefcase-outline', go: { root: 'PackingList' } },
];

export default function Fab({ visible = true }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  const go = (action) => {
    const { tab, screen, root } = action.go;
    if (root) navigation.navigate(root);
    else if (screen) navigation.navigate('Main', { screen: tab, params: { screen } });
    else navigation.navigate('Main', { screen: tab });
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { haptic.light(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel="Quick add"
        style={[styles.fab, { bottom: theme.layout.tabBarHeight + 22 + insets.bottom }]}
      >
        <Ionicons name="add" size={28} color={theme.colors.onAccent} />
      </TouchableOpacity>

      <ActionSheet
        visible={open}
        title="Quick add"
        onClose={() => setOpen(false)}
        actions={ACTIONS.map((a) => ({ label: a.label, icon: a.icon, subtitle: a.subtitle, onPress: () => go(a) }))}
      />
    </>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    borderWidth: theme.border.width,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
});
