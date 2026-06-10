'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { SplitPanel } from '@/components/layout/SplitPanel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LockIcon } from '@/components/ui/icons';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/schemas';
import { useChangePassword } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { applyFieldErrors, handleApiError } from '@/lib/error-handler';

/**
 * First-login password change for provisioned admins. Reached automatically from
 * the login redirect / RoleGate when `mustChangePassword` is set. Once the new
 * password is saved the flag clears and the user continues into the portal.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user, updateUser } = useAuth();
  const mutation = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Guard: only authenticated users belong here. Anyone who doesn't actually need
  // to change a password is sent on to their home, so this isn't a loose backdoor.
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && !user.mustChangePassword) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/concerts');
    }
  }, [isReady, isAuthenticated, user, router]);

  const onSubmit = (values: ChangePasswordInput) => {
    mutation.mutate(values, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success('Password updated');
        router.replace(updated.role === 'ADMIN' ? '/admin' : '/concerts');
      },
      onError: (err) => {
        if (!applyFieldErrors(err, setError)) {
          handleApiError(err, 'Could not update password');
        }
      },
    });
  };

  if (!isReady || !isAuthenticated || (user && !user.mustChangePassword)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <SplitPanel>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Update Password</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Set a new password to finish securing your account.
          </p>
        </div>
        <Input
          label="New Password"
          testId="change-password-new"
          passwordToggle
          autoComplete="new-password"
          placeholder="Create a Password"
          leadingIcon={<LockIcon />}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="Confirm Password"
          testId="change-password-confirm"
          passwordToggle
          autoComplete="new-password"
          placeholder="Re-enter your Password"
          leadingIcon={<LockIcon />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={mutation.isPending} data-testid="change-password-submit">
          Update Password
        </Button>
      </form>
    </SplitPanel>
  );
}
