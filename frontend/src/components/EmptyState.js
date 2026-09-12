import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ icon = 'shirt-outline', title, subtitle }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={theme.colors.textFaint} />
      <Text style={[theme.typography.h3, { marginTop: 12 }]}>{title}</Text>
      {subtitle ? <Text style={[theme.typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
});
