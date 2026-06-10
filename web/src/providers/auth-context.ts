'use client';

import { createContext } from 'react';
import type { AuthUser, Role } from '@/lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  /** The account's true role from the JWT — the authority for permission checks. */
  role: Role | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (token: string, user: AuthUser) => void;
  /** Refresh the stored user (same token) — e.g. after a first-login password change. */
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
