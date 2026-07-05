import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, radius, typography, spacing } from '../theme/colors';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const navigation = useNavigation();
  const [homeCity, setHomeCity] = useState(user?.homeCity || '');
  const [saving, setSaving] = useState(false);

  const handleSaveCity = async () => {
    setSaving(true);
    try {
      await updateProfile({ homeCity });
      Alert.alert('Saved', 'Home city updated');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={30} color={colors.accent} />
        </View>
        <View style={{ marginLeft: 14 }}>
          <Text style={typography.h2}>{user?.name}</Text>
          <Text style={typography.bodyMuted}>{user?.email}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={() => navigation.navigate('PackingList')}>
        <Card style={styles.menuCard}>
          <Ionicons name="briefcase-outline" size={20} color={colors.accent} />
          <Text style={[typography.h3, { marginLeft: 12, flex: 1 }]}>Plan a Trip Packing List</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Card>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
        <Card style={[styles.menuCard, { marginTop: 12 }]}>
          <Ionicons name="server-outline" size={20} color={colors.accent} />
          <Text style={[typography.h3, { marginLeft: 12, flex: 1 }]}>Server Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Card>
      </TouchableOpacity>

      <Card style={{ marginTop: 16 }}>
        <Text style={[typography.h3, { marginBottom: 12 }]}>Home City</Text>
        <Input value={homeCity} onChangeText={setHomeCity} placeholder="e.g. Gurgaon" />
        <Button title="Save" onPress={handleSaveCity} loading={saving} />
      </Card>

      <Button title="Log Out" variant="outline" onPress={logout} style={{ marginTop: spacing(6) }} />

      <Text style={styles.footer}>Wardrobe Manager · Built with MERN + Expo</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 60, height: 60, borderRadius: radius.pill, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  menuCard: { flexDirection: 'row', alignItems: 'center' },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: 30 },
});
