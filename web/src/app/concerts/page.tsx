'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RoleGate } from '@/components/layout/RoleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { ConcertCard } from '@/components/concerts/ConcertCard';
import { CardListSkeleton } from '@/components/feedback/Skeletons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useConcerts, useReserve, useCancelReservation } from '@/lib/queries';
import { handleApiError } from '@/lib/error-handler';
import type { Concert } from '@/lib/types';

function ConcertsView() {
  const { data: concerts, isLoading, isError, refetch } = useConcerts();
  const reserve = useReserve();
  const cancel = useCancelReservation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleReserve = (concert: Concert) => {
    setPendingId(concert.id);
    reserve.mutate(concert.id, {
      onSuccess: () => toast.success('Seat reserved'),
      onError: (err) => handleApiError(err, 'Could not reserve seat'),
      onSettled: () => setPendingId(null),
    });
  };

  const handleCancel = (concert: Concert) => {
    if (!concert.myReservation) return;
    setPendingId(concert.id);
    cancel.mutate(
      { reservationId: concert.myReservation.id, concertId: concert.id },
      {
        onSuccess: () => toast.success('Reservation cancelled'),
        onError: (err) => handleApiError(err, 'Could not cancel reservation'),
        onSettled: () => setPendingId(null),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Concerts</h1>
        <Link
          href="/reservations"
          data-testid="my-reservations-link"
          className="text-sm font-semibold text-primary"
        >
          My reservations
        </Link>
      </div>

      {isLoading && <CardListSkeleton />}

      {isError && (
        <EmptyState
          testId="concerts-error"
          title="Couldn't load concerts"
          description="Please try again."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && concerts && concerts.length === 0 && (
        <EmptyState
          testId="concerts-empty"
          title="No concerts yet"
          description="Check back soon for upcoming concerts."
        />
      )}

      {!isLoading && !isError && concerts && concerts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {concerts.map((concert) => (
            <ConcertCard
              key={concert.id}
              concert={concert}
              variant="user"
              pending={pendingId === concert.id}
              onReserve={handleReserve}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConcertsPage() {
  return (
    <RoleGate>
      <Sidebar view="user">
        <ConcertsView />
      </Sidebar>
    </RoleGate>
  );
}
