import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBaseURL, setBaseURL, testConnection, DEFAULT_BASE_URL } from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors, typography, spacing } from '../theme/colors';

// Reachable both before login (first-run server setup) and from Profile afterwards.
export default function SettingsScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'fail' | null

  useEffect(() => {
    (async () => setUrl(await getBaseURL()))();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      await testConnection(url);
      setStatus('ok');
    } catch (err) {
      setStatus('fail');
      Alert.alert('Could not reach server', `${err.message}\n\nMake sure the backend is running and reachable from your phone (same WiFi, correct IP/port).`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) return Alert.alert('Missing URL', 'Enter your backend server URL');
    setSaving(true);
    try {
      await setBaseURL(url);
      Alert.alert('Saved', 'Server address updated.');
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={[typography.h1, { marginBottom: 4 }]}>Server Settings</Text>
      <Text style={[typography.bodyMuted, { marginBottom: 20 }]}>
        Point the app at your backend. Use your computer's LAN IP for a phone on the same WiFi (e.g. http://192.168.1.50:5000), 10.0.2.2 for the Android emulator, or your deployed API URL.
      </Text>

      <Input
        label="Backend URL"
        value={url}
        onChangeText={setUrl}
        placeholder={DEFAULT_BASE_URL}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      {status && (
        <Card style={[styles.statusCard, status === 'ok' ? styles.ok : styles.fail]}>
          <Ionicons
            name={status === 'ok' ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={status === 'ok' ? colors.success : colors.danger}
          />
          <Text style={[typography.bodyMuted, { marginLeft: 8 }]}>
            {status === 'ok' ? 'Connected successfully!' : 'Could not connect.'}
          </Text>
        </Card>
      )}

      <Button title="Test Connection" variant="outline" onPress={handleTest} loading={testing} style={{ marginTop: spacing(2) }} />
      <Button title="Save" onPress={handleSave} loading={saving} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ok: { backgroundColor: colors.successSoft },
  fail: { backgroundColor: colors.dangerSoft },
});
