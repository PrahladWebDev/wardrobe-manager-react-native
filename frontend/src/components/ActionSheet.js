import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

// Bottom sheet of actions. Replaces multi-button Alert.alert calls, which
// Android silently truncates to three buttons.
//
//   <ActionSheet visible title="Add photo" onClose={...}
//     actions={[{ label, icon, onPress, destructive?, subtitle? }]} />
export default function ActionSheet({ visible, title, subtitle, actions = [], onClose, cancelLabel = 'Cancel' }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close">
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.handle} />
          {title ? <Text style={[theme.typography.h2, { marginBottom: subtitle ? 2 : 8 }]}>{title}</Text> : null}
          {subtitle ? <Text style={[theme.typography.bodyMuted, { marginBottom: 10 }]}>{subtitle}</Text> : null}
          {actions.map((a) => (
            <TouchableOpacity
              key={a.label}
              onPress={() => { haptic.select(); onClose && onClose(); a.onPress && a.onPress(); }}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              activeOpacity={0.7}
              style={styles.row}
            >
              <View style={[styles.rowIcon, a.destructive && { backgroundColor: theme.colors.dangerSoft }]}>
                <Ionicons name={a.icon || 'ellipse-outline'} size={20} color={a.destructive ? theme.colors.danger : theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.body, { fontWeight: '600', color: a.destructive ? theme.colors.danger : theme.colors.text }]}>{a.label}</Text>
                {a.subtitle ? <Text style={theme.typography.caption}>{a.subtitle}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.cancel}>
            <Text style={[theme.typography.button, { color: theme.colors.textMuted }]}>{cancelLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
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
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.textFaint, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
  rowIcon: {
    width: 38, height: 38, borderRadius: theme.radius.sm, backgroundColor: theme.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});