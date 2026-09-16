import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';

function MenuRow({ icon, title, subtitle, onPress, theme, style }) {
  return (
    <Card style={[{ flexDirection: 'row', alignItems: 'center' }, style]} onPress={onPress} accessibilityLabel={title}>
      <View style={{ width: 38, height: 38, borderRadius: theme.radius.sm, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={theme.colors.accent} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={theme.typography.h3}>{title}</Text>
        {subtitle ? <Text style={theme.typography.caption}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
    </Card>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const toast = useToast();
  const { user, logout, updateProfile } = useAuth();
  const navigation = useNavigation();
  const [homeCity, setHomeCity] = useState(user?.homeCity || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission needed', 'Please allow photo library access to continue.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      haptic.success();
      toast('Profile photo updated');
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveCity = async () => {
    setSaving(true);
    try {
      await updateProfile({ homeCity: homeCity.trim() });
      haptic.success();
      toast('Home city saved');
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    haptic.warning();
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const cityDirty = (homeCity || '').trim() !== (user?.homeCity || '');

  return (
    <Screen title="Profile" scroll keyboard>
      <View style={styles.avatarRow}>
        <TouchableOpacity
          onPress={handlePickAvatar}
          disabled={uploadingAvatar}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          hitSlop={theme.hitSlop}
        >
          <View style={styles.avatar}>
            {uploadingAvatar ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            ) : (
              <Ionicons name="person" size={30} color={theme.colors.accent} />
            )}
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={13} color={theme.colors.onAccent} />
          </View>
        </TouchableOpacity>
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text style={theme.typography.h2} numberOfLines={1}>{user?.name}</Text>
          <Text style={theme.typography.bodyMuted} numberOfLines={1}>{user?.email}</Text>
        </View>
      </View>

      <MenuRow icon="color-palette-outline" title="Appearance & settings" subtitle="Theme, outfit rotation" onPress={() => navigation.navigate('Settings')} theme={theme} />
      <MenuRow icon="briefcase-outline" title="Plan a trip packing list" subtitle="Weather-aware, from your closet" onPress={() => navigation.navigate('PackingList')} theme={theme} style={{ marginTop: 12 }} />

      <Card style={{ marginTop: 16 }}>
        <Text style={[theme.typography.h3, { marginBottom: 2 }]}>Home city</Text>
        <Text style={[theme.typography.caption, { marginBottom: 12 }]}>Used for weather when location is off.</Text>
        <Input value={homeCity} onChangeText={setHomeCity} placeholder="e.g. Gurgaon" leftIcon="location-outline" returnKeyType="done" onSubmitEditing={cityDirty ? handleSaveCity : undefined} />
        <Button title="Save" onPress={handleSaveCity} loading={saving} disabled={!cityDirty} />
      </Card>

      <Button title="Log out" variant="outline" icon="log-out-outline" onPress={confirmLogout} style={{ marginTop: theme.spacing(6) }} />
      <Button
        title="Delete account"
        variant="ghost"
        icon="trash-outline"
        onPress={() => navigation.navigate('DeleteAccount')}
        style={{ marginTop: theme.spacing(2) }}
        textStyle={{ color: theme.colors.danger || theme.colors.accent }}
      />

      <Text style={styles.footer}>Foldd ·  Wardrobe Manager</Text>
    </Screen>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 64, height: 64, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.border.width, borderColor: theme.colors.text,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: theme.colors.bg,
  },
  footer: { textAlign: 'center', ...theme.typography.caption, color: theme.colors.textFaint, marginTop: 30 },
});
