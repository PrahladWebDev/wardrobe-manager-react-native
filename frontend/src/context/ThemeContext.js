import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, themeList, DEFAULT_THEME_ID } from '../theme/themes';

const STORAGE_KEY = 'wardrobe:themeId';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && themes[saved]) setThemeId(saved);
      })
      .finally(() => setReady(true));
  }, []);

  const setTheme = (id) => {
    if (!themes[id]) return;
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  };

  const value = useMemo(
    () => ({
      ...themes[themeId],
      themeId,
      setTheme,
      themeList,
    }),
    [themeId]
  );

  // Avoid flashing default theme before saved preference loads.
  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
