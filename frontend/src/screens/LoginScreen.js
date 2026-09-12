import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
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
        <View style={styles.logoWrap}>
          <Ionicons name="shirt" size={40} color={theme.colors.accent} />
          <Text style={[theme.typography.h1, { marginTop: theme.spacing(3) }]}>Wardrobe</Text>
          <Text style={theme.typography.bodyMuted}>Your closet, organized.</Text>
        </View>

        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />

        <Button title="Log In" onPress={handleLogin} loading={loading} style={{ marginTop: theme.spacing(2) }} />

        <Button
          title="Create an account"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: theme.spacing(3) }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  hint: { ...theme.typography.bodyMuted, textAlign: 'center', marginTop: 12, fontSize: 12 },
});