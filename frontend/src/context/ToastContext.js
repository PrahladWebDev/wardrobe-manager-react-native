import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(() => {});

// const toast = useToast(); toast('Saved'); toast('Oops', 'error');
export const useToast = () => useContext(ToastContext);

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' };

export function ToastProvider({ children }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const y = useRef(new Animated.Value(-140)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    Animated.timing(y, { toValue: -140, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [y]);

  const show = useCallback((message, type = 'success', duration = 2200) => {
    if (!message) return;
    clearTimeout(timer.current);
    setToast({ message: String(message), type: ICONS[type] ? type : 'info' });
    y.setValue(-140);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
    timer.current = setTimeout(hide, duration);
  }, [y, hide]);

  const bg = toast?.type === 'error' ? theme.colors.danger : toast?.type === 'info' ? theme.colors.info : theme.colors.accent;
  const fg = toast?.type === 'success' ? theme.colors.onAccent : '#FFFFFF';

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              top: insets.top + 8,
              transform: [{ translateY: y }],
              backgroundColor: bg,
              borderRadius: theme.radius.md,
              borderWidth: theme.border.width,
              borderColor: theme.colors.text,
              ...theme.shadow.card,
            },
          ]}
        >
          <Ionicons name={ICONS[toast.type]} size={20} color={fg} />
          <Text style={[theme.typography.body, { color: fg, marginLeft: 10, fontWeight: '600', flex: 1 }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
});
