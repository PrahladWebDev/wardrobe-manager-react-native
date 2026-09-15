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

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (name.trim().length < 2) next.name = 'Enter your name';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 6) next.password = 'Use at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const clear = (key) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const handleRegister = async () => {
    setFormError('');
    if (!validate()) { haptic.warning(); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      haptic.success();
    } catch (err) {
      haptic.error();
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length >= 12 ? 'Strong' : password.length >= 8 ? 'Good' : password.length >= 6 ? 'Okay' : '';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Create account" subtitle="Start building your digital closet" />

        <FadeInUp delay={280} distance={18}>
          <Input label="Name" value={name} onChangeText={(t) => { setName(t); clear('name'); }} placeholder="Jane Doe" leftIcon="person-outline" textContentType="name" error={errors.name} returnKeyType="next" style={styles.pillInput} />
        </FadeInUp>
        <FadeInUp delay={330} distance={18}>
          <Input label="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" value={email} onChangeText={(t) => { setEmail(t); clear('email'); }} placeholder="you@example.com" leftIcon="mail-outline" error={errors.email} returnKeyType="next" style={styles.pillInput} />
        </FadeInUp>
        <FadeInUp delay={380} distance={18}>
          <Input
            label="Password"
            secureTextEntry
            secureToggle
            textContentType="newPassword"
            value={password}
            onChangeText={(t) => { setPassword(t); clear('password'); }}
            placeholder="At least 6 characters"
            leftIcon="lock-closed-outline"
            error={errors.password}
            helperText={strength ? `${strength} password` : undefined}
            returnKeyType="go"
            onSubmitEditing={handleRegister}
            style={styles.pillInput}
          />
        </FadeInUp>

        {formError ? (
          <View style={styles.formError} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
            <Text style={[theme.typography.caption, { color: theme.colors.danger, marginLeft: 8, flex: 1 }]}>{formError}</Text>
          </View>
        ) : null}

        <FadeInUp delay={440} distance={18}>
          <AnimatedPillButton title="Sign up" onPress={handleRegister} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={500} distance={18}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.switchRow} accessibilityRole="link">
            <Text style={styles.switchMuted}>Have an account? </Text>
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
