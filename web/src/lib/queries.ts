'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type {
  AdminEventsResponse,
  AdminStats,
  AuthResponse,
  Concert,
  Reservation,
} from './types';
import type { CreateConcertInput, LoginInput, RegisterInput } from './schemas';

export const queryKeys = {
  concerts: ['concerts'] as const,
  myReservations: ['reservations', 'me'] as const,
  adminEvents: ['admin', 'events'] as const,
  adminStats: ['admin', 'stats'] as const,
};

// --- Auth mutations ---

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => {
      // confirmPassword is client-only and must not be sent.
      const { name, email, password } = input;
      return apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
    },
  });
}

// --- Concert queries ---

export function useConcerts(enabled = true): UseQueryResult<Concert[]> {
  return useQuery({
    queryKey: queryKeys.concerts,
    queryFn: () => apiFetch<Concert[]>('/concerts'),
    enabled,
  });
}

export function useMyReservations(enabled = true): UseQueryResult<Reservation[]> {
  return useQuery({
    queryKey: queryKeys.myReservations,
    queryFn: () => apiFetch<Reservation[]>('/reservations/me'),
    enabled,
  });
}

export function useAdminStats(enabled = true): UseQueryResult<AdminStats> {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => apiFetch<AdminStats>('/admin/stats'),
    enabled,
  });
}

export function useAdminEvents(enabled = true): UseQueryResult<AdminEventsResponse> {
  return useQuery({
    queryKey: queryKeys.adminEvents,
    queryFn: () =>
      apiFetch<AdminEventsResponse>('/admin/reservations?page=1&pageSize=100'),
    enabled,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.concerts });
  qc.invalidateQueries({ queryKey: queryKeys.myReservations });
  qc.invalidateQueries({ queryKey: queryKeys.adminStats });
  qc.invalidateQueries({ queryKey: queryKeys.adminEvents });
}

// --- Reservation mutations (optimistic) ---

export function useReserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (concertId: string) =>
      apiFetch(`/concerts/${concertId}/reservations`, { method: 'POST' }),
    onMutate: async (concertId: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.concerts });
      const previous = qc.getQueryData<Concert[]>(queryKeys.concerts);
      qc.setQueryData<Concert[]>(queryKeys.concerts, (old) =>
        old?.map((c) =>
          c.id === concertId
            ? {
                ...c,
                reservedSeats: c.reservedSeats + 1,
                availableSeats: c.availableSeats - 1,
                soldOut: c.availableSeats - 1 <= 0,
                myReservation: { id: 'optimistic', status: 'ACTIVE' },
              }
            : c,
        ),
      );
      return { previous };
    },
    onError: (_err, _concertId, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.concerts, context.previous);
      }
    },
    onSettled: () => {
      invalidateAll(qc);
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    // concertId is passed for optimistic targeting; reservationId for the request.
    mutationFn: ({ reservationId }: { reservationId: string; concertId?: string }) =>
      apiFetch(`/reservations/${reservationId}`, { method: 'DELETE' }),
    onMutate: async ({ concertId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.concerts });
      const previous = qc.getQueryData<Concert[]>(queryKeys.concerts);
      if (concertId) {
        qc.setQueryData<Concert[]>(queryKeys.concerts, (old) =>
          old?.map((c) =>
            c.id === concertId
              ? {
                  ...c,
                  reservedSeats: Math.max(0, c.reservedSeats - 1),
                  availableSeats: c.availableSeats + 1,
                  soldOut: false,
                  myReservation: null,
                }
              : c,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.concerts, context.previous);
      }
    },
    onSettled: () => {
      invalidateAll(qc);
    },
  });
}

// --- Admin concert mutations ---

export function useCreateConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConcertInput) =>
      apiFetch<Concert>('/concerts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      invalidateAll(qc);
    },
  });
}

export function useDeleteConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (concertId: string) =>
      apiFetch(`/concerts/${concertId}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidateAll(qc);
    },
  });
}
