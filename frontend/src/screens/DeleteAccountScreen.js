import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { haptic } from '../utils/haptics';

// Reachable from Profile -> Delete account.
// Google Play's User Data policy requires any app that supports account
// creation to also offer in-app account deletion, so this screen (plus the
// DELETE /api/auth/me endpoint) exists to satisfy that requirement.
export default function DeleteAccountScreen() {
  const theme = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    haptic.warning();
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, closet items, outfits, wear history, packing lists, polls and wishlist. This can\u2019t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount(password);
      haptic.success();
      // AuthContext clears the token/user, so AppNavigator swaps back to the
      // Auth stack on its own — nothing left to navigate here.
    } catch (err) {
      haptic.error();
      toast(err.message, 'error');
      setDeleting(false);
    }
  };

  return (
    <Screen title="Delete account" scroll keyboard safeTop={false}>
      <Card style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="warning-outline" size={20} color={theme.colors.danger || theme.colors.accent} style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={[theme.typography.body, { flex: 1 }]}>
            Deleting your account is permanent. All of your closet items, outfits, wear history,
            packing lists, polls and wishlist will be erased and cannot be recovered.
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={[theme.typography.h3, { marginBottom: 12 }]}>Confirm your password</Text>
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          leftIcon="lock-closed-outline"
          secureToggle
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="done"
        />
        <Button
          title="Delete my account"
          variant="danger"
          icon="trash-outline"
          onPress={confirmDelete}
          loading={deleting}
          disabled={!password}
          style={{ marginTop: 4 }}
        />
      </Card>
    </Screen>
  );
}
