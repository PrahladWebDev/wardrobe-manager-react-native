import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1 of password reset: ask for the email, then hand off to ResetPassword.
// The API answers identically for known and unknown addresses, so this screen
// always advances — it can't confirm whether an account exists.
export default function ForgotPasswordScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState(route.params?.email || '');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setFormError('');
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address');
      haptic.warning();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      haptic.success();
      navigation.navigate('ResetPassword', { email: trimmed });
    } catch (err) {
      haptic.error();
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Forgot password" subtitle="We'll email you a code to reset it" />

        <FadeInUp delay={280} distance={18}>
          <Input
            label="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
            placeholder="you@example.com"
            leftIcon="mail-outline"
            error={error}
            returnKeyType="go"
            onSubmitEditing={handleSend}
            style={styles.pillInput}
          />
        </FadeInUp>

        {formError ? (
          <View style={styles.formError} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
            <Text style={[theme.typography.caption, { color: theme.colors.danger, marginLeft: 8, flex: 1 }]}>{formError}</Text>
          </View>
        ) : null}

        <FadeInUp delay={340} distance={18}>
          <AnimatedPillButton title="Send code" onPress={handleSend} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={400} distance={18}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.switchRow} accessibilityRole="link">
            <Text style={styles.switchMuted}>Remembered it? </Text>
            <Text style={styles.switchLink}>Log in</Text>
          </TouchableOpacity>
        </FadeInUp>
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(5), minHeight: 44, alignItems: 'center' },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
});
