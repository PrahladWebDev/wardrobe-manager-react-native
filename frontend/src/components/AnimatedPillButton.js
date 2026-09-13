import React, { useRef } from 'react';
import { Animated, Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Same pill shape/weight as the rest of the app's Button, but with a
// tactile press-in scale so the primary auth action feels responsive.
export default function AnimatedPillButton({ title, onPress, loading = false, disabled = false, variant = 'primary', style }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={[styles.base, isPrimary ? styles.primary : styles.text, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={isPrimary ? theme.colors.onAccent : theme.colors.accent} />
        ) : (
          <Text style={[theme.typography.button, { color: isPrimary ? theme.colors.onAccent : theme.colors.accent }]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    base: {
      paddingVertical: 15,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: theme.colors.accent,
      borderWidth: theme.border.width,
      borderColor: theme.colors.text,
    },
    text: { backgroundColor: 'transparent', paddingVertical: 10 },
    disabled: { opacity: 0.5 },
  });
