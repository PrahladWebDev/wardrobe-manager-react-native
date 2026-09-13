import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import AnimatedPillButton from '../components/AnimatedPillButton';
import AuthHero from '../components/AuthHero';
import FadeInUp from '../components/FadeInUp';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Missing info', 'Fill in all fields');
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      Alert.alert('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero title="Create account" subtitle="Start building your digital closet" />

        <FadeInUp delay={280} distance={18}>
          <Input label="Name" value={name} onChangeText={setName} placeholder="Jane Doe" style={styles.pillInput} />
        </FadeInUp>
        <FadeInUp delay={330} distance={18}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" style={styles.pillInput} />
        </FadeInUp>
        <FadeInUp delay={380} distance={18}>
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" style={styles.pillInput} />
        </FadeInUp>

        <FadeInUp delay={440} distance={18}>
          <AnimatedPillButton title="Sign Up" onPress={handleRegister} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        </FadeInUp>

        <FadeInUp delay={500} distance={18}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.switchRow}>
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
  pillInput: { borderRadius: theme.radius.pill, paddingHorizontal: 20 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing(5) },
  switchMuted: { ...theme.typography.bodyMuted },
  switchLink: { ...theme.typography.bodyMuted, color: theme.colors.accent, fontWeight: '700' },
});
