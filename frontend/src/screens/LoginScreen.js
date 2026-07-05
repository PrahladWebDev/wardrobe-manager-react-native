import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors, typography, spacing } from '../theme/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@wardrobe.app');
  const [password, setPassword] = useState('demo1234');
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
        <View style={styles.logoWrap}>
          <Ionicons name="shirt" size={40} color={colors.accent} />
          <Text style={[typography.h1, { marginTop: spacing(3) }]}>Wardrobe</Text>
          <Text style={typography.bodyMuted}>Your closet, organized.</Text>
        </View>

        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

        <Button title="Log In" onPress={handleLogin} loading={loading} style={{ marginTop: spacing(2) }} />

        <Text style={styles.hint}>Demo account is pre-filled — just tap Log In.</Text>

        <Button
          title="Create an account"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: spacing(3) }}
        />

        <Button
          title="Server Settings"
          variant="ghost"
          onPress={() => navigation.navigate('Settings')}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  hint: { ...typography.bodyMuted, textAlign: 'center', marginTop: 12, fontSize: 12 },
});
