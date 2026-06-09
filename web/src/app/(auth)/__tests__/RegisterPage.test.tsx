import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import RegisterPage from '../register/page';

const mockMutate = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('@/lib/queries', () => ({
  useRegister: () => ({ mutate: mockMutate, isPending: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('RegisterPage password match', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a mismatch error and does not submit when passwords differ', async () => {
    render(<RegisterPage />, { wrapper });

    await userEvent.type(screen.getByTestId('signup-name'), 'Sara John');
    await userEvent.type(screen.getByTestId('signup-email'), 'sara@example.com');
    await userEvent.type(screen.getByTestId('signup-password'), 'password123');
    await userEvent.type(screen.getByTestId('signup-confirm-password'), 'different123');
    await userEvent.click(screen.getByTestId('signup-submit'));

    expect(await screen.findByTestId('signup-confirm-password-error')).toHaveTextContent(
      /do not match/i,
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('enforces minimum password length', async () => {
    render(<RegisterPage />, { wrapper });

    await userEvent.type(screen.getByTestId('signup-name'), 'Sara John');
    await userEvent.type(screen.getByTestId('signup-email'), 'sara@example.com');
    await userEvent.type(screen.getByTestId('signup-password'), 'short');
    await userEvent.type(screen.getByTestId('signup-confirm-password'), 'short');
    await userEvent.click(screen.getByTestId('signup-submit'));

    expect(await screen.findByTestId('signup-password-error')).toHaveTextContent(/8 characters/i);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits without confirmPassword leaking into the mutation payload', async () => {
    render(<RegisterPage />, { wrapper });

    await userEvent.type(screen.getByTestId('signup-name'), 'Sara John');
    await userEvent.type(screen.getByTestId('signup-email'), 'sara@example.com');
    await userEvent.type(screen.getByTestId('signup-password'), 'password123');
    await userEvent.type(screen.getByTestId('signup-confirm-password'), 'password123');
    await userEvent.click(screen.getByTestId('signup-submit'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      name: 'Sara John',
      email: 'sara@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
  });
});
