'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store, useAppSelector } from './index';

interface StoreProviderProps {
  children: React.ReactNode;
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useAppSelector((s) => s.auth.themeMode);
  const themeSchema = useAppSelector((s) => s.auth.themeSchema);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.setAttribute('data-theme-schema', themeSchema);
  }, [themeMode, themeSchema]);

  return <>{children}</>;
}

export default function StoreProvider({ children }: StoreProviderProps) {
  return (
    <Provider store={store}>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
