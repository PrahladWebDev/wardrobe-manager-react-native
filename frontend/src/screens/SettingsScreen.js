import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBaseURL, setBaseURL, testConnection, DEFAULT_BASE_URL } from '../api/client';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

function ThemeSwatch({ option, active, onPress, mutedColor }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ alignItems: 'center', width: 74 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: option.bg,
          borderWidth: active ? 2.5 : 1,
          borderColor: active ? option.accent : 'rgba(0,0,0,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: option.accent }} />
        {active && (
          <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: option.accent, borderRadius: 10, padding: 2 }}>
            <Ionicons name="checkmark" size={11} color={option.mode === 'dark' ? '#000' : '#fff'} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: mutedColor }}>{option.name}</Text>
    </TouchableOpacity>
  );
}

// Reachable both before login (first-run server setup) and from Profile afterwards.
export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, updateProfile } = useAuth();
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'fail' | null
  const [rotationDays, setRotationDays] = useState(user?.rotationDays ?? 5);
  const [savingRotation, setSavingRotation] = useState(false);

  useEffect(() => {
    (async () => setUrl(await getBaseURL()))();
  }, []);

  const adjustRotation = async (delta) => {
    const next = Math.max(0, Math.min(30, rotationDays + delta));
    setRotationDays(next);
    setSavingRotation(true);
    try {
      await updateProfile({ rotationDays: next });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingRotation(false);
    }
  };

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
      <Text style={[theme.typography.h1, { marginBottom: 4 }]}>Appearance</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
        Pick a look for the app. Applies everywhere, instantly.
      </Text>

      <Card style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'flex-start' }}>
          {theme.themeList.map((option) => (
            <ThemeSwatch
              key={option.id}
              option={option}
              active={option.id === theme.themeId}
              onPress={() => theme.setTheme(option.id)}
              mutedColor={theme.colors.textMuted}
            />
          ))}
        </View>
      </Card>

      {user && (
        <>
          <Text style={[theme.typography.h1, { marginBottom: 4 }]}>Outfit Rotation</Text>
          <Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
            Suggestions and "Surprise Me" will avoid re-offering something you wore within this many days, when possible.
          </Text>
          <Card style={{ marginBottom: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => adjustRotation(-1)}
              disabled={savingRotation || rotationDays <= 0}
              style={[styles.stepperBtn, (savingRotation || rotationDays <= 0) && { opacity: 0.4 }]}
            >
              <Ionicons name="remove" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={theme.typography.h1}>{rotationDays === 0 ? 'Off' : rotationDays}</Text>
              <Text style={theme.typography.label}>{rotationDays === 0 ? 'NO ROTATION' : rotationDays === 1 ? 'DAY REST' : 'DAYS REST'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => adjustRotation(1)}
              disabled={savingRotation || rotationDays >= 30}
              style={[styles.stepperBtn, (savingRotation || rotationDays >= 30) && { opacity: 0.4 }]}
            >
              <Ionicons name="add" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </Card>
        </>
      )}

      <Text style={[theme.typography.h1, { marginBottom: 4 }]}>Server Settings</Text>
      <Text style={[theme.typography.bodyMuted, { marginBottom: 20 }]}>
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
            color={status === 'ok' ? theme.colors.success : theme.colors.danger}
          />
          <Text style={[theme.typography.bodyMuted, { marginLeft: 8 }]}>
            {status === 'ok' ? 'Connected successfully!' : 'Could not connect.'}
          </Text>
        </Card>
      )}

      <Button title="Test Connection" variant="outline" onPress={handleTest} loading={testing} style={{ marginTop: theme.spacing(2) }} />
      <Button title="Save" onPress={handleSave} loading={saving} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  statusCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ok: { backgroundColor: theme.colors.successSoft },
  fail: { backgroundColor: theme.colors.dangerSoft },
  stepperBtn: {
    width: 40, height: 40, borderRadius: theme.radius.pill,
    borderWidth: theme.border.width, borderColor: theme.colors.text,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
});
