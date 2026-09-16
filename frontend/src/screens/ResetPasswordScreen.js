import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import OtpInput from '../components/OtpInput';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

const RESEND_SECONDS = 60;

// Step 2 of password reset. A successful reset returns a JWT, so the user
// lands straight in the app — no second login.
export default function ResetPasswordScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { resetPassword, resendCode } = useAuth();
  const email = route.params?.email || '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const clear = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const validate = () => {
    const next = {};
    if (code.trim().length !== 6) next.code = 'Enter the 6-digit code';
    if (password.length < 6) next.password = 'Use at least 6 characters';
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleReset = async () => {
    setFormError('');
    setNotice('');
    if (!validate()) { haptic.warning(); return; }
    setLoading(true);
    try {
      await resetPassword(email, code.trim(), password);
      haptic.success();
      // AppNavigator switches to the signed-in stack on success.
    } catch (err) {
      haptic.error();
      setFormError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setFormError('');
    setNotice('');
    try {
      await resendCode(email, 'reset');
      setCode('');
      setCooldown(RESEND_SECONDS);
      setNotice('A new code is on its way.');
      haptic.success();
    } catch (err) {
      haptic.error();
      setFormError(err.message);
      const wait = Number(String(err.message).match(/(\d+)s/)?.[1]);
      if (wait) setCooldown(wait);
    }
  };

  const strength = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : password.length >= 6 ? 'Okay' : '';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Set a new password" subtitle={`Enter the code we sent to ${email}`} />

        <FadeInUp delay={280} distance={18}>
          <OtpInput
            value={code}
            onChangeText={(t) => { setCode(t); clear('code'); }}
            error={errors.code}
            editable={!loading}
          />
        </FadeInUp>

        <FadeInUp delay={330} distance={18}>
          <Input
            label="New password"
            secureTextEntry
            secureToggle
            textContentType="newPassword"
            value={password}
            onChangeText={(t) => { setPassword(t); clear('password'); }}
            placeholder="At least 6 characters"
            leftIcon="lock-closed-outline"
            error={errors.password}
            helperText={strength ? `${strength} password` : undefined}
            returnKeyType="next"
            containerStyle={{ marginTop: theme.spacing(3) }}
            style={styles.pillInput}
          />
        </FadeInUp>

        <FadeInUp delay={380} distance={18}>
          <Input
            label="Confirm password"
            secureTextEntry
            secureToggle
            textContentType="newPassword"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); clear('confirm'); }}
            placeholder="Re-enter your password"
            leftIcon="lock-closed-outline"
            error={errors.confirm}
            returnKeyType="go"
            onSubmitEditing={handleReset}
            style={styles.pillInput}
          />
        </FadeInUp>

        {formError ? (
          <View style={styles.formError} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
            <Text style={[theme.typography.caption, { color: theme.colors.danger, marginLeft: 8, flex: 1 }]}>{formError}</Text>
          </View>
        ) : notice ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />
            <Text style={[theme.typography.caption, { color: theme.colors.text, marginLeft: 8, flex: 1 }]}>{notice}</Text>
          </View>
        ) : null}

        <FadeInUp delay={440} distance={18}>
          <AnimatedPillButton title="Reset password" onPress={handleReset} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={500} distance={18}>
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

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backRow} accessibilityRole="link">
          <Ionicons name="arrow-back" size={16} color={theme.colors.textMuted} />
          <Text style={[styles.switchMuted, { marginLeft: 6 }]}>Back to log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  pillInput: { borderRadius: theme.radius.pill, paddingHorizontal: 18 },
  formError: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  notice: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(4), minHeight: 44, alignItems: 'center' },
  backRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', minHeight: 44 },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
  switchLinkDisabled: { color: theme.colors.textFaint },
});
