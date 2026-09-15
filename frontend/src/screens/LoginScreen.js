import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';
import { haptic } from '../utils/haptics';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    setFormError('');
    if (!validate()) { haptic.warning(); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      haptic.success();
    } catch (err) {
      haptic.error();
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        hitSlop={theme.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        style={[styles.gear, { top: insets.top + 12 }]}
      >
        <Ionicons name="settings-outline" size={24} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Welcome back" subtitle="Your closet, organized." />

        <FadeInUp delay={280} distance={18}>
          <Input
            label="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
            placeholder="you@example.com"
            leftIcon="mail-outline"
            error={errors.email}
            returnKeyType="next"
            style={styles.pillInput}
          />
        </FadeInUp>
        <FadeInUp delay={340} distance={18}>
          <Input
            label="Password"
            secureTextEntry
            secureToggle
            textContentType="password"
            value={password}
            onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
            placeholder="••••••••"
            leftIcon="lock-closed-outline"
            error={errors.password}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            style={styles.pillInput}
          />
        </FadeInUp>

        {formError ? (
          <FadeInUp delay={0} distance={8}>
            <View style={styles.formError} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={[theme.typography.caption, { color: theme.colors.danger, marginLeft: 8, flex: 1 }]}>{formError}</Text>
            </View>
          </FadeInUp>
        ) : null}

        <FadeInUp delay={400} distance={18}>
          <AnimatedPillButton title="Log in" onPress={handleLogin} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={460} distance={18}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchRow} accessibilityRole="link">
            <Text style={styles.switchMuted}>New here? </Text>
            <Text style={styles.switchLink}>Create an account</Text>
          </TouchableOpacity>
        </FadeInUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  gear: { position: 'absolute', right: 20, zIndex: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pillInput: { borderRadius: theme.radius.pill, paddingHorizontal: 18 },
  formError: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(5), minHeight: 44, alignItems: 'center' },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
});
