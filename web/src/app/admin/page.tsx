'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RoleGate } from '@/components/layout/RoleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatCard } from '@/components/admin/StatCard';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { ConcertCard } from '@/components/concerts/ConcertCard';
import { ConcertForm } from '@/components/concerts/ConcertForm';
import { CardListSkeleton, StatsSkeleton } from '@/components/feedback/Skeletons';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PersonIcon, AwardIcon, XCircleIcon } from '@/components/ui/icons';
import {
  useAdminStats,
  useConcerts,
  useCreateConcert,
  useDeleteConcert,
} from '@/lib/queries';
import { handleApiError } from '@/lib/error-handler';
import { isApiError } from '@/lib/api-client';
import type { Concert } from '@/lib/types';
import type { CreateConcertInput } from '@/lib/schemas';

type Tab = 'overview' | 'create';

const TABS: { key: Tab; label: string; testId: string }[] = [
  { key: 'overview', label: 'Overview', testId: 'tab-overview' },
  { key: 'create', label: 'Create', testId: 'tab-create' },
];

function StatsRow() {
  const { data, isLoading } = useAdminStats();
  if (isLoading || !data) return <StatsSkeleton />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        testId="admin-stat-total-seats"
        label="Total of seats"
        value={data.totalSeats}
        tone="brand"
        icon={<PersonIcon width={24} height={24} />}
      />
      <StatCard
        testId="admin-stat-reserved"
        label="Reserve"
        value={data.totalReserved}
        tone="success"
        icon={<AwardIcon width={24} height={24} />}
      />
      <StatCard
        testId="admin-stat-cancelled"
        label="Cancel"
        value={data.totalCancelled}
        tone="danger"
        icon={<XCircleIcon width={24} height={24} />}
      />
    </div>
  );
}

function Overview() {
  const { data: concerts, isLoading, isError, refetch } = useConcerts();
  const deleteConcert = useDeleteConcert();
  const [target, setTarget] = useState<Concert | null>(null);

  const confirmDelete = () => {
    if (!target) return;
    deleteConcert.mutate(target.id, {
      onSuccess: () => {
        toast.success('Delete successfully');
        setTarget(null);
      },
      onError: (err) => {
        handleApiError(err, 'Could not delete concert');
        setTarget(null);
      },
    });
  };

  if (isLoading) return <CardListSkeleton />;
  if (isError)
    return (
      <EmptyState
        testId="admin-concerts-error"
        title="Couldn't load concerts"
        onRetry={() => refetch()}
      />
    );
  if (!concerts || concerts.length === 0)
    return (
      <EmptyState
        testId="admin-concerts-empty"
        title="No concerts yet"
        description="Create your first concert from the Create tab."
      />
    );

  return (
    <>
      <div className="flex flex-col gap-4">
        {concerts.map((concert) => (
          <ConcertCard
            key={concert.id}
            concert={concert}
            variant="admin"
            onDelete={setTarget}
          />
        ))}
      </div>
      <ConfirmDeleteDialog
        open={!!target}
        concertName={target?.name ?? ''}
        pending={deleteConcert.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}

function Create({ onCreated }: { onCreated: () => void }) {
  const createConcert = useCreateConcert();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>();

  const handleSubmit = (values: CreateConcertInput) => {
    setFieldErrors(undefined);
    createConcert.mutate(values, {
      onSuccess: () => {
        toast.success('Create successfully');
        onCreated();
      },
      onError: (err) => {
        if (isApiError(err) && err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        } else {
          handleApiError(err, 'Could not create concert');
        }
      },
    });
  };

  return (
    <ConcertForm
      onSubmit={handleSubmit}
      submitting={createConcert.isPending}
      serverFieldErrors={fieldErrors}
    />
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="flex flex-col gap-6">
      <StatsRow />

      <div className="flex gap-6 border-b border-[var(--border)]">
        {TABS.map(({ key, label, testId }) => (
          <button
            key={key}
            type="button"
            data-testid={testId}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-3 font-semibold transition ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <Overview /> : <Create onCreated={() => setTab('overview')} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGate allow="ADMIN">
      <Sidebar view="admin">
        <AdminDashboard />
      </Sidebar>
    </RoleGate>
  );
}
