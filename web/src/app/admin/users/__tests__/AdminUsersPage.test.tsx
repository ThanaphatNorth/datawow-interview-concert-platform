import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import AdminUsersPage from '../page';
import type { AdminUser } from '@/lib/types';

const mockCreate = jest.fn();
const mockDelete = jest.fn();

const admins: AdminUser[] = [
  {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    mustChangePassword: false,
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'a2',
    name: 'New Admin',
    email: 'new-admin@example.com',
    role: 'ADMIN',
    mustChangePassword: true,
    createdAt: '2026-06-02T10:00:00.000Z',
  },
];

// RoleGate + Sidebar pull from these; provide a minimal authenticated admin.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin/users',
}));

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isReady: true,
    isAuthenticated: true,
    role: 'ADMIN',
    user: { id: 'a1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', mustChangePassword: false },
    logout: jest.fn(),
  }),
}));

jest.mock('@/lib/queries', () => ({
  useAdminUsers: () => ({ data: admins, isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateAdmin: () => ({ mutate: mockCreate, isPending: false }),
  useDeleteAdmin: () => ({ mutate: mockDelete, isPending: false }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('AdminUsersPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists admins with their status and flags the current admin', () => {
    render(<AdminUsersPage />, { wrapper });

    const rows = screen.getAllByTestId('admin-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]).getByTestId('admin-row-status')).toHaveTextContent(/must change password/i);
    // The current admin's delete button is disabled (can't delete yourself).
    expect(screen.getByTestId('admin-delete-a1')).toBeDisabled();
    expect(screen.getByTestId('admin-delete-a2')).toBeEnabled();
  });

  it('validates the create form and blocks submit on a short password', async () => {
    render(<AdminUsersPage />, { wrapper });

    await userEvent.type(screen.getByTestId('admin-name-input'), 'Another Admin');
    await userEvent.type(screen.getByTestId('admin-email-input'), 'another@example.com');
    await userEvent.type(screen.getByTestId('admin-password-input'), 'short');
    await userEvent.click(screen.getByTestId('admin-create-btn'));

    expect(await screen.findByTestId('admin-password-input-error')).toHaveTextContent(
      /8 characters/i,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits a valid new admin', async () => {
    render(<AdminUsersPage />, { wrapper });

    await userEvent.type(screen.getByTestId('admin-name-input'), 'Another Admin');
    await userEvent.type(screen.getByTestId('admin-email-input'), 'another@example.com');
    await userEvent.type(screen.getByTestId('admin-password-input'), 'Temp12345');
    await userEvent.click(screen.getByTestId('admin-create-btn'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Another Admin',
      email: 'another@example.com',
      password: 'Temp12345',
    });
  });
});
