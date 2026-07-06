'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import { store, useAppSelector } from './index';

interface StoreProviderProps {
  children: React.ReactNode;
}

import { applyCustomColors, clearCustomColors } from '../utils/theme';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((s) => s.auth.themeMode);
  const themeSchema = useAppSelector((s) => s.auth.themeSchema);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-theme-schema', themeSchema);

    // Parse custom themes if any
    let customThemes: any[] = [];
    if (user?.customThemes) {
      try {
        customThemes = JSON.parse(user.customThemes);
      } catch (e) {
        // ignore
      }
    }

    const activeCustom = customThemes.find((t) => t.id === themeSchema);

    if (activeCustom && (activeCustom.darkColors || activeCustom.colors)) {
      // Resolve which color set to use based on current theme mode
      const resolvedMode =
        themeMode === 'system'
          ? window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'dark'
          : themeMode;

      let colors: any;
      if (activeCustom.darkColors) {
        colors =
          resolvedMode === 'light'
            ? activeCustom.lightColors
            : activeCustom.darkColors;
      } else {
        colors = activeCustom.colors;
      }

      applyCustomColors(colors, resolvedMode === 'dark');
    } else {
      clearCustomColors();
    }
  }, [themeMode, themeSchema, user]);

  return <>{children}</>;
}

export default function StoreProvider({ children }: StoreProviderProps) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
