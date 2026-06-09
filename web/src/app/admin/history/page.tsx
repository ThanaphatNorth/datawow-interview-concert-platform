'use client';

import { RoleGate } from '@/components/layout/RoleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { HistoryTable } from '@/components/admin/HistoryTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TableSkeleton } from '@/components/feedback/Skeletons';
import { useAdminEvents } from '@/lib/queries';

function HistoryView() {
  const { data, isLoading, isError, refetch } = useAdminEvents();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">History</h1>

      {isLoading && <TableSkeleton />}

      {isError && (
        <EmptyState
          testId="history-error"
          title="Couldn't load history"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState
          testId="history-empty"
          title="No activity yet"
          description="Reservation and cancellation events will appear here."
        />
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <HistoryTable events={data.data} />
      )}
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <RoleGate allow="ADMIN">
      <Sidebar view="admin">
        <HistoryView />
      </Sidebar>
    </RoleGate>
  );
}
