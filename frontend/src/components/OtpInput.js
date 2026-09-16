import React, { useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Six separate boxes backed by a single hidden TextInput. Going through one
 * input (rather than six real ones) keeps SMS/email autofill working and
 * sidesteps the usual backspace-focus bugs of per-digit fields.
 */
export default function OtpInput({
  value,
  onChangeText,
  length = 6,
  onComplete,
  error,
  autoFocus = true,
  editable = true,
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const inputRef = useRef(null);
  const digits = value.split('');

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = (text) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChangeText(next);
    if (next.length === length) onComplete?.(next);
  };

  // The active box is the next empty one, or the last one when full.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
        accessibilityRole="none"
        accessibilityLabel={`Verification code, ${value.length} of ${length} digits entered`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = !!digits[i];
          const active = editable && i === activeIndex;
          return (
            <View
              key={i}
              style={[
                styles.box,
                filled && styles.boxFilled,
                active && styles.boxActive,
                !!error && styles.boxError,
              ]}
            >
              <Text style={styles.digit}>{digits[i] || ''}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        editable={editable}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        style={styles.hidden}
        caretHidden
      />

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: theme.border.width,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  boxFilled: { borderColor: theme.colors.text },
  boxActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
  boxError: { borderColor: theme.colors.danger },
  digit: { ...theme.typography.h3, fontSize: 22, color: theme.colors.text },
  // Kept on-screen but invisible: RN won't focus a display:none input, and
  // opacity 0 with zero height keeps the keyboard behaviour intact.
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: { ...theme.typography.caption, color: theme.colors.danger, marginTop: 8, textAlign: 'center' },
});
