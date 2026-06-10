import { renderHook } from '@testing-library/react';
import {
  TOKEN_KEY,
  USER_KEY,
  getToken,
  getStoredUser,
  storeSession,
  clearSession,
  useAuth,
} from '../auth';
import type { AuthUser } from '../types';

const user: AuthUser = {
  id: 'u1',
  name: 'Sara',
  email: 'sara@example.com',
  role: 'USER',
  mustChangePassword: false,
};

describe('session storage helpers', () => {
  beforeEach(() => window.localStorage.clear());

  it('storeSession persists token and user; getters read them back', () => {
    storeSession('tok123', user);

    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('tok123');
    expect(getToken()).toBe('tok123');
    expect(getStoredUser()).toEqual(user);
  });

  it('getStoredUser returns null when nothing is stored', () => {
    expect(getStoredUser()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('getStoredUser returns null (no throw) on corrupted JSON', () => {
    window.localStorage.setItem(USER_KEY, '{not valid json');
    expect(getStoredUser()).toBeNull();
  });

  it('clearSession removes both keys', () => {
    storeSession('tok123', user);
    clearSession();
    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});

describe('useAuth', () => {
  it('throws a helpful error when used outside an AuthProvider', () => {
    // Silence the expected React error log for the thrown render.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
