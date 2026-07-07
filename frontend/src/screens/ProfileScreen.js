import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, radius, typography, spacing } from '../theme/colors';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [homeCity, setHomeCity] = useState(user?.homeCity || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', 'Please allow photo library access to continue.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const form = new FormData();
      form.append('avatar', { uri: asset.uri, name: filename || 'avatar.jpg', type });
      await updateProfile(form);
    } catch (err) {
      Alert.alert('Could not update photo', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 60 }}>
      <View style={styles.avatarRow}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.8}>
          <View style={styles.avatar}>
            {uploadingAvatar ? (
              <ActivityIndicator color={colors.accent} />
            ) : user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={30} color={colors.accent} />
            )}
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={13} color="#fff" />
          </View>
        </TouchableOpacity>
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
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg,
  },
  menuCard: { flexDirection: 'row', alignItems: 'center' },
  footer: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: 30 },
});