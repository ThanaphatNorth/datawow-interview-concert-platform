'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RoleGate } from '@/components/layout/RoleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/feedback/Skeletons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useMyReservations, useCancelReservation } from '@/lib/queries';
import { handleApiError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/format';
import type { Reservation } from '@/lib/types';

function ReservationsView() {
  const { data, isLoading, isError, refetch } = useMyReservations();
  const cancel = useCancelReservation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleCancel = (reservation: Reservation) => {
    setPendingId(reservation.id);
    cancel.mutate(
      { reservationId: reservation.id, concertId: reservation.concert.id },
      {
        onSuccess: () => toast.success('Reservation cancelled'),
        onError: (err) => handleApiError(err, 'Could not cancel reservation'),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">My reservations</h1>

      {isLoading && <CardListSkeleton count={2} />}

      {isError && (
        <EmptyState
          testId="reservations-error"
          title="Couldn't load reservations"
          action={
            <button onClick={() => refetch()} className="font-semibold text-primary">
              Retry
            </button>
          }
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          testId="reservations-empty"
          title="No reservations yet"
          description="Reserve a seat from the Concerts page to see it here."
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul data-testid="reservations-list" className="flex flex-col gap-3">
          {data.map((r) => (
            <li
              key={r.id}
              data-testid="reservation-row"
              className="flex flex-col gap-3 rounded-card border border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-primary" data-testid="reservation-concert">
                  {r.concert.name}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{formatDateTime(r.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  data-testid="reservation-status"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    r.status === 'ACTIVE'
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {r.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                </span>
                {r.status === 'ACTIVE' && (
                  <Button
                    variant="danger"
                    loading={pendingId === r.id}
                    data-testid="reservation-cancel-btn"
                    onClick={() => handleCancel(r)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <RoleGate allow="USER">
      <Sidebar view="user">
        <ReservationsView />
      </Sidebar>
    </RoleGate>
  );
}
