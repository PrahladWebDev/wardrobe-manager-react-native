import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/colors';

export default function EmptyState({ icon = 'shirt-outline', title, subtitle }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={colors.textFaint} />
      <Text style={[typography.h3, { marginTop: 12 }]}>{title}</Text>
      {subtitle ? <Text style={[typography.bodyMuted, { textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
});
