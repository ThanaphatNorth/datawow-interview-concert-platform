import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useConcerts,
  useMyReservations,
  useAdminStats,
  useAdminEvents,
  useRegister,
  useLogin,
  useCreateConcert,
  useDeleteConcert,
  queryKeys,
} from '../queries';
import { apiFetch } from '../api-client';

jest.mock('../api-client', () => ({
  apiFetch: jest.fn(),
  isApiError: jest.fn(() => false),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => jest.clearAllMocks());

describe('read queries hit the right endpoints', () => {
  it.each([
    ['useConcerts', useConcerts, '/concerts'],
    ['useMyReservations', useMyReservations, '/reservations/me'],
    ['useAdminStats', useAdminStats, '/admin/stats'],
    ['useAdminEvents', useAdminEvents, '/admin/reservations?page=1&pageSize=100'],
  ])('%s fetches %s', async (_name, hook, path) => {
    mockApiFetch.mockResolvedValue([] as never);
    const { result } = renderHook(() => hook(), { wrapper: makeWrapper(freshClient()) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(path);
  });
});

describe('useRegister', () => {
  it('strips confirmPassword before sending to the API', async () => {
    mockApiFetch.mockResolvedValue({ accessToken: 't', user: {} } as never);
    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper(freshClient()) });

    act(() => {
      result.current.mutate({
        name: 'Sara',
        email: 'sara@example.com',
        password: 'secret12',
        confirmPassword: 'secret12',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const body = JSON.parse((mockApiFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ name: 'Sara', email: 'sara@example.com', password: 'secret12' });
    expect(body).not.toHaveProperty('confirmPassword');
  });
});

describe('useLogin', () => {
  it('POSTs credentials to /auth/login', async () => {
    mockApiFetch.mockResolvedValue({ accessToken: 't', user: {} } as never);
    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper(freshClient()) });

    act(() => {
      result.current.mutate({ email: 'a@b.com', password: 'secret12' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('admin concert mutations invalidate caches on success', () => {
  it('useCreateConcert POSTs and invalidates concerts + admin queries', async () => {
    const client = freshClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    mockApiFetch.mockResolvedValue({ id: 'c1' } as never);

    const { result } = renderHook(() => useCreateConcert(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.mutate({ name: 'Live', description: 'd', totalSeats: 10 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/concerts',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.concerts });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.adminStats });
  });

  it('useDeleteConcert DELETEs and invalidates caches', async () => {
    const client = freshClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    mockApiFetch.mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useDeleteConcert(), { wrapper: makeWrapper(client) });
    act(() => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/concerts/c1', { method: 'DELETE' });
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.concerts });
  });
});
