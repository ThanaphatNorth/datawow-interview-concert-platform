'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { SplitPanel } from '@/components/layout/SplitPanel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PersonIcon, LockIcon } from '@/components/ui/icons';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import { useLogin } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { isApiError } from '@/lib/api-client';
import { applyFieldErrors, handleApiError } from '@/lib/error-handler';

/**
 * Shared login form. The Figma has role-specific login screens that differ only
 * in the button label and brand tagline; auth itself is unified (POST /auth/login,
 * role derived from the JWT). `submitLabel`/`quote` carry those cosmetic differences.
 */
export function LoginForm({
  submitLabel,
  quote,
  showRegister = true,
}: {
  submitLabel: string;
  quote?: string;
  /** Admins are seeded (no self-registration), so the admin login hides this. */
  showRegister?: boolean;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const mutation = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: LoginInput) => {
    mutation.mutate(values, {
      onSuccess: (res) => {
        login(res.accessToken, res.user);
        toast.success('Welcome back');
        router.replace(res.user.role === 'ADMIN' ? '/admin' : '/concerts');
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 401) {
          setError('password', { message: 'Invalid email or password' });
        } else if (!applyFieldErrors(err, setError)) {
          handleApiError(err, 'Login failed');
        }
      },
    });
  };

  return (
    <SplitPanel quote={quote}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <h1 className="text-center text-4xl font-bold">Login</h1>
        {errors.password?.message === 'Invalid email or password' && (
          <p data-testid="auth-error" className="text-center text-sm text-danger">
            Invalid email or password
          </p>
        )}
        <Input
          label="Email"
          testId="login-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your Email Address"
          leadingIcon={<PersonIcon />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          testId="login-password"
          passwordToggle
          autoComplete="current-password"
          placeholder="Enter your Password"
          leadingIcon={<LockIcon />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={mutation.isPending} data-testid="login-submit">
          {submitLabel}
        </Button>
        {showRegister && (
          <p className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              data-testid="login-register-link"
              className="font-semibold text-primary"
            >
              Create an account
            </Link>
          </p>
        )}
      </form>
    </SplitPanel>
  );
}
