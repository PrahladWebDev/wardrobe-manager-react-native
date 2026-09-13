import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Missing info', 'Enter email and password');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Welcome back" subtitle="Your closet, organized." />

        <FadeInUp delay={280} distance={18}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" style={styles.pillInput} />
        </FadeInUp>
        <FadeInUp delay={340} distance={18}>
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" style={styles.pillInput} />
        </FadeInUp>

        <FadeInUp delay={400} distance={18}>
          <AnimatedPillButton title="Log In" onPress={handleLogin} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={460} distance={18}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchRow}>
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
  pillInput: { borderRadius: theme.radius.pill, paddingHorizontal: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(5) },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
});
