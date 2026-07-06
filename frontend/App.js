import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { scheduleDailyLogReminder } from './src/utils/notifications';

function NotificationBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Fire-and-forget: silently no-ops if permission is denied.
      scheduleDailyLogReminder(20, 0).catch(() => {});
    }
  }, [user]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NotificationBootstrap />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
