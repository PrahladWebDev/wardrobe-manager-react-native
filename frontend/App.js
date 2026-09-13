import React, { useEffect } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { scheduleDailyLogReminder } from './src/utils/notifications';

function StartupScreen({ message = 'Loading your wardrobe…' }) {
  const theme = useTheme();
  return (
    <View style={[styles.startup, { backgroundColor: theme.colors.bg }]}>
      <Image source={require('./assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, { color: theme.colors.text }]}>Wardrobe Manager</Text>
      <ActivityIndicator size="small" color={theme.colors.accent} style={styles.spinner} />
      <Text style={[styles.message, { color: theme.colors.textFaint }]}>{message}</Text>
    </View>
  );
}

function NotificationBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) scheduleDailyLogReminder(20, 0).catch(() => {});
  }, [user]);
  return null;
}

function ThemedApp() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold });

  // Never leave the user on a completely blank screen if font loading fails.
  if (!fontsLoaded && !fontError) return <StartupScreen message="Preparing the app…" />;

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <NotificationBootstrap />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 150, height: 150, borderRadius: 75 },
  title: { marginTop: 18, fontSize: 24, fontWeight: '700' },
  spinner: { marginTop: 24 },
  message: { marginTop: 10, fontSize: 13 },
});
