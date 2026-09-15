import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Section label + content block for forms (chip groups, toggles). Replaces the
// three copies of `sectionLabel` that AddItem, CreateOutfit and WishlistForm
// each declared.
export default function Field({ label, hint, error, children, style, row = true }) {
  const theme = useTheme();
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={[theme.typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{label}</Text> : null}
      <View style={row ? { flexDirection: 'row', flexWrap: 'wrap' } : null}>{children}</View>
      {error ? <Text style={[theme.typography.caption, { color: theme.colors.danger, marginTop: 4 }]}>{error}</Text> : null}
      {!error && hint ? <Text style={[theme.typography.caption, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}
