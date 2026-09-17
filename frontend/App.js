import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Animated, Image, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { scheduleDailyLogReminder } from './src/utils/notifications';

// Keep the native splash up until the full-screen brand poster below has been
// decoded, so there is never a blank frame between the two.
SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_BG = '#631324';      // must match the native splash backgroundColor in app.json
const MIN_POSTER_MS = 1400;       // long enough to read, short enough not to annoy
const NATIVE_HIDE_FALLBACK_MS = 2000;

// Android 12+ only allows a small centred icon on the *system* splash screen,
// so a full-screen poster can't be shown natively there. This overlay takes
// over from the native splash (same background colour, poster fades in) and
// gives the full-bleed artwork on every Android version, then fades out once
// fonts, theme and auth are ready.
function BrandSplash({ ready }) {
  const [visible, setVisible] = useState(true);
  const [minElapsed, setMinElapsed] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const posterOpacity = useRef(new Animated.Value(0)).current;
  const handedOff = useRef(false);

  const handOff = useCallback(() => {
    if (handedOff.current) return;
    handedOff.current = true;
    SplashScreen.hideAsync().catch(() => {});
    Animated.timing(posterOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    setTimeout(() => setMinElapsed(true), MIN_POSTER_MS);
  }, [posterOpacity]);

  // Never get stuck behind the native splash if the image event doesn't fire.
  useEffect(() => {
    const t = setTimeout(handOff, NATIVE_HIDE_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [handOff]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    Animated.timing(overlayOpacity, { toValue: 0, duration: 360, useNativeDriver: true }).start(() => setVisible(false));
  }, [ready, minElapsed, overlayOpacity]);

  if (!visible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.brandSplash, { opacity: overlayOpacity }]} pointerEvents="auto" accessibilityLabel="FoldD is loading">
      <StatusBar style="light" />
      <Animated.Image
        source={require('./assets/splash.png')}
        style={[StyleSheet.absoluteFill, styles.poster, { opacity: posterOpacity }]}
        resizeMode="cover"
        onLoad={handOff}
        onError={handOff}
        fadeDuration={0}
      />
    </Animated.View>
  );
}

function StartupScreen({ message = 'Loading your wardrobe…' }) {
  const theme = useTheme();
  return (
    <View style={[styles.startup, { backgroundColor: theme.colors.bg }]}>
      <Image source={require('./assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>
        <Text style={{ color: theme.colors.text }}>Fold</Text>
        <Text style={{ color: theme.colors.accent }}>D</Text>
      </Text>
      <ActivityIndicator size="small" color={theme.colors.accent} style={styles.spinner} />
      <Text style={[styles.message, { color: theme.colors.textFaint }]}>{message}</Text>
    </View>
  );
}

function NotificationBootstrap() {
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => {
    if (userId) scheduleDailyLogReminder(20, 0).catch(() => {});
  }, [userId]);
  return null;
}

function ThemedApp({ onReady }) {
  const theme = useTheme();
  const { loading: authLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold });
  const fontsReady = fontsLoaded || !!fontError;
  const appReady = fontsReady && !authLoading;

  useEffect(() => {
    if (appReady) onReady();
  }, [appReady, onReady]);

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      {!fontsReady ? (
        <StartupScreen message="Preparing the app…" />
      ) : (
        <ToastProvider>
          <NotificationBootstrap />
          <AppNavigator />
        </ToastProvider>
      )}
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp onReady={onReady} />
        </AuthProvider>
      </ThemeProvider>
      <BrandSplash ready={ready} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  brandSplash: { backgroundColor: SPLASH_BG, zIndex: 9999, elevation: 9999 },
  poster: { width: '100%', height: '100%' },
  startup: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 150, height: 150, borderRadius: 34 },
  title: { marginTop: 18, fontSize: 24, fontWeight: '700' },
  spinner: { marginTop: 24 },
  message: { marginTop: 10, fontSize: 13 },
});
