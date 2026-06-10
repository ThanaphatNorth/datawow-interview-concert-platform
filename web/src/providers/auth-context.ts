'use client';

import { createContext } from 'react';
import type { AuthUser, Role } from '@/lib/types';

export interface AuthContextValue {
  user: AuthUser | null;
  /** The account's true role from the JWT — the authority for permission checks. */
  role: Role | null;
  /**
   * The role the user is currently *acting as* in the UI. Defaults to the account
   * role on login. An ADMIN can drop to 'USER' via the sidebar switch; a USER can
   * never become 'ADMIN' (the switch is gated on `role`). Kept separate from `role`
   * so switching to the user view never strips an admin's ability to switch back.
   */
  activeRole: Role | null;
  setActiveRole: (role: Role) => void;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (token: string, user: AuthUser) => void;
  /** Refresh the stored user (same token) — e.g. after a first-login password change. */
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
