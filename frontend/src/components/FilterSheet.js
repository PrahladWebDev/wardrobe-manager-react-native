import React from 'react';
import { Modal, Pressable, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Chip from './Chip';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';

// Bottom sheet holding several chip groups. Replaces stacked rows of filter
// chips that ate a third of the Wardrobe screen.
//
//   sections: [{ key, title, value, options: [{ key, label }], onChange }]
export default function FilterSheet({ visible, title = 'Filters', sections = [], onClose, onClear, activeCount = 0 }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={theme.typography.h2}>{title}</Text>
          {activeCount > 0 ? (
            <Button title="Clear all" variant="ghost" onPress={onClear} style={styles.clearBtn} />
          ) : null}
        </View>
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {sections.map((s) => (
            <View key={s.key} style={{ marginBottom: 18 }}>
              <Text style={[theme.typography.label, { textTransform: 'uppercase', marginBottom: 8 }]}>{s.title}</Text>
              <View style={styles.chipWrap}>
                {s.options.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    active={s.value === o.key}
                    onPress={() => s.onChange(o.key)}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <Button title="Done" onPress={onClose} />
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    borderBottomWidth: 0,
    borderColor: theme.colors.text,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.textFaint, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
