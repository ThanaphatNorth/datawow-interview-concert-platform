'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { RoleGate } from '@/components/layout/RoleGate';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TableSkeleton } from '@/components/feedback/Skeletons';
import { PersonIcon, LockIcon, TrashIcon } from '@/components/ui/icons';
import { useAdminUsers, useCreateAdmin, useDeleteAdmin } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { isApiError } from '@/lib/api-client';
import { applyFieldErrors, handleApiError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/format';
import { createAdminSchema, type CreateAdminInput } from '@/lib/schemas';
import type { AdminUser } from '@/lib/types';

function CreateAdminForm() {
  const createAdmin = useCreateAdmin();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = (values: CreateAdminInput) => {
    createAdmin.mutate(values, {
      onSuccess: () => {
        toast.success('Admin created');
        reset();
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 409) {
          setError('email', { message: 'Email already registered' });
        } else if (!applyFieldErrors(err, setError)) {
          handleApiError(err, 'Could not create admin');
        }
      },
    });
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-primary">Create admin</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        The new admin signs in with this temporary password and must set their own on first login.
      </p>
      <div className="my-5 h-px bg-[var(--border)]" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
        data-testid="admin-form"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Input
            label="Full name"
            testId="admin-name-input"
            placeholder="Enter full name"
            leadingIcon={<PersonIcon />}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email"
            testId="admin-email-input"
            type="email"
            autoComplete="off"
            placeholder="Enter email address"
            leadingIcon={<PersonIcon />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Temporary password"
            testId="admin-password-input"
            passwordToggle
            autoComplete="new-password"
            placeholder="Set a temporary password"
            leadingIcon={<LockIcon />}
            error={errors.password?.message}
            {...register('password')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={createAdmin.isPending} data-testid="admin-create-btn">
            Create admin
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AdminsTable({
  admins,
  currentUserId,
  onDelete,
}: {
  admins: AdminUser[];
  currentUserId?: string;
  onDelete: (admin: AdminUser) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-[var(--border)] bg-white">
      <table data-testid="admins-table" className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 font-bold">Name</th>
            <th className="px-4 py-3 font-bold">Email</th>
            <th className="px-4 py-3 font-bold">Status</th>
            <th className="px-4 py-3 font-bold">Created</th>
            <th className="px-4 py-3 font-bold text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => {
            const isSelf = admin.id === currentUserId;
            return (
              <tr key={admin.id} data-testid="admin-row" className="border-b border-[var(--border)]">
                <td className="px-4 py-3" data-testid="admin-row-name">
                  {admin.name}
                  {isSelf && <span className="ml-2 text-xs text-[var(--text-muted)]">(you)</span>}
                </td>
                <td className="px-4 py-3" data-testid="admin-row-email">
                  {admin.email}
                </td>
                <td className="px-4 py-3">
                  {admin.mustChangePassword ? (
                    <span
                      data-testid="admin-row-status"
                      className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
                    >
                      Must change password
                    </span>
                  ) : (
                    <span
                      data-testid="admin-row-status"
                      className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                    >
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {formatDateTime(admin.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    data-testid={`admin-delete-${admin.id}`}
                    onClick={() => onDelete(admin)}
                    disabled={isSelf}
                    aria-label={`Delete ${admin.name}`}
                    title={isSelf ? "You can't delete your own account" : `Delete ${admin.name}`}
                    className="text-danger transition hover:brightness-90 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdminManagement() {
  const { user } = useAuth();
  const { data: admins, isLoading, isError, refetch } = useAdminUsers();
  const deleteAdmin = useDeleteAdmin();
  const [target, setTarget] = useState<AdminUser | null>(null);

  const confirmDelete = () => {
    if (!target) return;
    deleteAdmin.mutate(target.id, {
      onSuccess: () => {
        toast.success('Admin removed');
        setTarget(null);
      },
      onError: (err) => {
        handleApiError(err, 'Could not remove admin');
        setTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Admin Management</h1>

      <CreateAdminForm />

      {isLoading && <TableSkeleton />}

      {isError && (
        <EmptyState
          testId="admins-error"
          title="Couldn't load admins"
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && admins && admins.length === 0 && (
        <EmptyState testId="admins-empty" title="No admins yet" />
      )}

      {!isLoading && !isError && admins && admins.length > 0 && (
        <AdminsTable admins={admins} currentUserId={user?.id} onDelete={setTarget} />
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        testId="admin-delete-dialog"
        labelledBy="admin-delete-title"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <p id="admin-delete-title" className="text-base font-semibold">
            Remove this admin?
            <br />
            <span data-testid="admin-delete-name">&ldquo;{target?.name}&rdquo;</span>
          </p>
          <div className="flex w-full justify-center gap-3">
            <Button
              variant="outline"
              data-testid="admin-delete-cancel"
              onClick={() => setTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteAdmin.isPending}
              data-testid="admin-delete-confirm"
              onClick={confirmDelete}
            >
              Yes, Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGate allow="ADMIN">
      <Sidebar view="admin">
        <AdminManagement />
      </Sidebar>
    </RoleGate>
  );
}
