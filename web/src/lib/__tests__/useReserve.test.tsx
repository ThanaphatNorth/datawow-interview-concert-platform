import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useReserve, useCancelReservation, queryKeys } from '../queries';
import { apiFetch } from '../api-client';
import type { Concert } from '../types';

jest.mock('../api-client', () => ({
  apiFetch: jest.fn(),
  isApiError: jest.fn(() => false),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function makeConcert(overrides: Partial<Concert> = {}): Concert {
  return {
    id: 'c1',
    name: 'Summer Live',
    description: 'Open-air',
    totalSeats: 500,
    reservedSeats: 100,
    availableSeats: 400,
    soldOut: false,
    createdAt: '2026-06-10T00:00:00.000Z',
    myReservation: null,
    ...overrides,
  };
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useReserve optimistic update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistically decrements available seats then confirms on success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.concerts, [makeConcert()]);
    mockApiFetch.mockResolvedValue({ id: 'r1', status: 'ACTIVE' });

    const { result } = renderHook(() => useReserve(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate('c1');
    });

    // Optimistic state applied synchronously during onMutate.
    await waitFor(() => {
      const data = client.getQueryData<Concert[]>(queryKeys.concerts)!;
      expect(data[0].availableSeats).toBe(399);
      expect(data[0].reservedSeats).toBe(101);
      expect(data[0].myReservation).toEqual({ id: 'optimistic', status: 'ACTIVE' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/concerts/c1/reservations', { method: 'POST' });
  });

  it('rolls back on error (e.g. 409 sold out)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.concerts, [makeConcert()]);
    mockApiFetch.mockRejectedValue({ status: 409, message: 'Concert is sold out' });

    const { result } = renderHook(() => useReserve(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate('c1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = client.getQueryData<Concert[]>(queryKeys.concerts)!;
    expect(data[0].availableSeats).toBe(400);
    expect(data[0].reservedSeats).toBe(100);
    expect(data[0].myReservation).toBeNull();
  });
});

describe('useCancelReservation optimistic update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistically returns a seat and clears myReservation', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.concerts, [
      makeConcert({ reservedSeats: 101, availableSeats: 399, myReservation: { id: 'r1', status: 'ACTIVE' } }),
    ]);
    mockApiFetch.mockResolvedValue({ id: 'r1', status: 'CANCELLED' });

    const { result } = renderHook(() => useCancelReservation(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ reservationId: 'r1', concertId: 'c1' });
    });

    await waitFor(() => {
      const data = client.getQueryData<Concert[]>(queryKeys.concerts)!;
      expect(data[0].availableSeats).toBe(400);
      expect(data[0].reservedSeats).toBe(100);
      expect(data[0].myReservation).toBeNull();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/reservations/r1', { method: 'DELETE' });
  });

  it('rolls back cancel on error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.concerts, [
      makeConcert({ reservedSeats: 101, availableSeats: 399, myReservation: { id: 'r1', status: 'ACTIVE' } }),
    ]);
    mockApiFetch.mockRejectedValue({ status: 403, message: 'Not the owner' });

    const { result } = renderHook(() => useCancelReservation(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ reservationId: 'r1', concertId: 'c1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = client.getQueryData<Concert[]>(queryKeys.concerts)!;
    expect(data[0].availableSeats).toBe(399);
    expect(data[0].reservedSeats).toBe(101);
    expect(data[0].myReservation).toEqual({ id: 'r1', status: 'ACTIVE' });
  });
});
