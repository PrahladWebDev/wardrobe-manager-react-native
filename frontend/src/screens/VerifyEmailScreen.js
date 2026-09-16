import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import OtpInput from '../components/OtpInput';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

const RESEND_SECONDS = 60;

/**
 * Step 2 of signup. Reached from Register (fresh signup) and from Login when
 * an existing but unverified account tries to sign in.
 * route.params: { email, purpose?: 'verify' }
 */
export default function VerifyEmailScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { verifyEmail, resendCode } = useAuth();
  const email = route.params?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const submittedFor = useRef('');

  // Countdown for the Resend link.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = useCallback(async (value) => {
    const entered = (value ?? code).trim();
    if (entered.length !== 6) {
      setError('Enter the 6-digit code');
      haptic.warning();
      return;
    }
    // Guard against the auto-submit and the button firing for the same code.
    if (loading || submittedFor.current === entered) return;
    submittedFor.current = entered;

    setError('');
    setNotice('');
    setLoading(true);
    try {
      await verifyEmail(email, entered);
      haptic.success();
      // No navigation needed — AppNavigator swaps to the signed-in stack.
    } catch (err) {
      haptic.error();
      setError(err.message);
      setCode('');
      submittedFor.current = '';
    } finally {
      setLoading(false);
    }
  }, [code, email, loading, verifyEmail]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setNotice('');
    try {
      await resendCode(email, 'verify');
      setCode('');
      submittedFor.current = '';
      setCooldown(RESEND_SECONDS);
      setNotice('A new code is on its way.');
      haptic.success();
    } catch (err) {
      haptic.error();
      setError(err.message);
      // Server-side cooldown is the source of truth; mirror it if it differs.
      const wait = Number(String(err.message).match(/(\d+)s/)?.[1]);
      if (wait) setCooldown(wait);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Check your email" subtitle={`We sent a 6-digit code to ${email}`} />

        <FadeInUp delay={280} distance={18}>
          <OtpInput
            value={code}
            onChangeText={(t) => { setCode(t); if (error) setError(''); }}
            onComplete={submit}
            error={error}
            editable={!loading}
          />
        </FadeInUp>

        {notice ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
            <Text style={[theme.typography.caption, { color: theme.colors.text, marginLeft: 8, flex: 1 }]}>{notice}</Text>
          </View>
        ) : null}

        <FadeInUp delay={340} distance={18}>
          <AnimatedPillButton
            title="Verify"
            onPress={() => submit()}
            loading={loading}
            style={{ marginTop: theme.spacing(3) }}
          />
        </FadeInUp>

        <FadeInUp delay={400} distance={18}>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0}
            style={styles.switchRow}
            accessibilityRole="button"
            accessibilityState={{ disabled: cooldown > 0 }}
          >
            <Text style={styles.switchMuted}>Didn't get it? </Text>
            <Text style={[styles.switchLink, cooldown > 0 && styles.switchLinkDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </FadeInUp>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backRow}
          accessibilityRole="link"
        >
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={[styles.switchMuted, { marginLeft: 6 }]}>Use a different email</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  notice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(4), minHeight: 44, alignItems: 'center' },
  backRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing(1), minHeight: 44 },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
  switchLinkDisabled: { color: theme.colors.textFaint },
});
