'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthUser } from '@/lib/types';
import { clearSession, getStoredUser, getToken, storeSession, TOKEN_KEY } from '@/lib/auth';

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setIsReady(true);

    // Cross-tab logout sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isReady,
      login: (token, nextUser) => {
        storeSession(token, nextUser);
        setUser(nextUser);
      },
      logout: () => {
        clearSession();
        setUser(null);
      },
    }),
    [user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          success: { className: 'fct-toast-success' },
          error: { className: 'fct-toast-error' },
        }}
      />
    </QueryClientProvider>
  );
}
