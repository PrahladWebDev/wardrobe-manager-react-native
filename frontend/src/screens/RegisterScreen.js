import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
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
        <Text style={[theme.typography.h1, { marginBottom: theme.spacing(1) }]}>Create account</Text>
        <Text style={[theme.typography.bodyMuted, { marginBottom: theme.spacing(6) }]}>Start building your digital closet</Text>

        <Input label="Name" value={name} onChangeText={setName} placeholder="Jane Doe" />
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />

        <Button title="Sign Up" onPress={handleRegister} loading={loading} style={{ marginTop: theme.spacing(2) }} />
        <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: theme.spacing(3) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
});
