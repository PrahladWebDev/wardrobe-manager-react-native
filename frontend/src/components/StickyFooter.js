import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

// Bottom action bar for forms: keeps the Save button reachable without
// scrolling and clear of the home indicator. Pair with a ScrollView whose
// contentContainerStyle has paddingBottom >= FOOTER_SPACE.
export const FOOTER_SPACE = 120;

export default function StickyFooter({ children, style }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: 14 + insets.bottom,
          backgroundColor: theme.colors.bg,
          borderTopColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1,
  },
});
