import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ChangePasswordPage from '../change-password/page';

const mockMutate = jest.fn();
const mockReplace = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isReady: true,
    isAuthenticated: true,
    user: { id: 'a1', name: 'New Admin', email: 'new-admin@example.com', role: 'ADMIN', mustChangePassword: true },
    updateUser: mockUpdateUser,
  }),
}));

jest.mock('@/lib/queries', () => ({
  useChangePassword: () => ({ mutate: mockMutate, isPending: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ChangePasswordPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a mismatch error and does not submit when passwords differ', async () => {
    render(<ChangePasswordPage />, { wrapper });

    await userEvent.type(screen.getByTestId('change-password-new'), 'BrandNew123');
    await userEvent.type(screen.getByTestId('change-password-confirm'), 'Different123');
    await userEvent.click(screen.getByTestId('change-password-submit'));

    expect(await screen.findByTestId('change-password-confirm-error')).toHaveTextContent(
      /do not match/i,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('enforces the minimum length on the new password', async () => {
    render(<ChangePasswordPage />, { wrapper });

    await userEvent.type(screen.getByTestId('change-password-new'), 'short');
    await userEvent.type(screen.getByTestId('change-password-confirm'), 'short');
    await userEvent.click(screen.getByTestId('change-password-submit'));

    expect(await screen.findByTestId('change-password-new-error')).toHaveTextContent(
      /8 characters/i,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits the new password (confirmPassword stays client-side)', async () => {
    render(<ChangePasswordPage />, { wrapper });

    await userEvent.type(screen.getByTestId('change-password-new'), 'BrandNew123');
    await userEvent.type(screen.getByTestId('change-password-confirm'), 'BrandNew123');
    await userEvent.click(screen.getByTestId('change-password-submit'));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      newPassword: 'BrandNew123',
      confirmPassword: 'BrandNew123',
    });
  });
});
