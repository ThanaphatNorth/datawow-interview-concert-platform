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
  AdminUser,
  AuthResponse,
  AuthUser,
  Concert,
  Reservation,
} from './types';
import type {
  ChangePasswordInput,
  CreateAdminInput,
  CreateConcertInput,
  LoginInput,
  RegisterInput,
} from './schemas';

export const queryKeys = {
  concerts: ['concerts'] as const,
  myReservations: ['reservations', 'me'] as const,
  adminEvents: ['admin', 'events'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminUsers: ['admin', 'users'] as const,
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

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      // confirmPassword is client-only and must not be sent.
      apiFetch<AuthUser>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: input.newPassword }),
      }),
  });
}

// --- Concert queries ---

export function useConcerts(): UseQueryResult<Concert[]> {
  return useQuery({
    queryKey: queryKeys.concerts,
    queryFn: () => apiFetch<Concert[]>('/concerts'),
  });
}

export function useMyReservations(): UseQueryResult<Reservation[]> {
  return useQuery({
    queryKey: queryKeys.myReservations,
    queryFn: () => apiFetch<Reservation[]>('/reservations/me'),
  });
}

export function useAdminStats(): UseQueryResult<AdminStats> {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => apiFetch<AdminStats>('/admin/stats'),
  });
}

export function useAdminEvents(): UseQueryResult<AdminEventsResponse> {
  return useQuery({
    queryKey: queryKeys.adminEvents,
    queryFn: () =>
      apiFetch<AdminEventsResponse>('/admin/reservations?page=1&pageSize=100'),
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

// --- Admin user management ---

export function useAdminUsers(): UseQueryResult<AdminUser[]> {
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => apiFetch<AdminUser[]>('/admin/users'),
  });
}

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminInput) =>
      apiFetch<AdminUser>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}

export function useDeleteAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
  });
}
