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
import { registerSchema, type RegisterInput } from '@/lib/schemas';
import { useRegister } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { isApiError } from '@/lib/api-client';
import { handleApiError } from '@/lib/error-handler';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const mutation = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = (values: RegisterInput) => {
    mutation.mutate(values, {
      onSuccess: (res) => {
        login(res.accessToken, res.user);
        toast.success('Account created');
        router.replace('/concerts');
      },
      onError: (err) => {
        if (isApiError(err) && err.status === 409) {
          setError('email', { message: 'Email already registered' });
        } else if (isApiError(err) && err.fieldErrors) {
          Object.entries(err.fieldErrors).forEach(([field, message]) =>
            setError(field as keyof RegisterInput, { message }),
          );
        } else {
          handleApiError(err, 'Registration failed');
        }
      },
    });
  };

  return (
    <SplitPanel>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <h1 className="text-center text-4xl font-bold">Sign Up</h1>
        <Input
          label="Full name"
          testId="signup-name"
          placeholder="Enter your Full Name"
          leadingIcon={<PersonIcon />}
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Email"
          testId="signup-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your Email Address"
          leadingIcon={<PersonIcon />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          testId="signup-password"
          passwordToggle
          autoComplete="new-password"
          placeholder="Create a Password"
          leadingIcon={<LockIcon />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm Password"
          testId="signup-confirm-password"
          passwordToggle
          autoComplete="new-password"
          placeholder="Re-enter your Password"
          leadingIcon={<LockIcon />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={mutation.isPending} data-testid="signup-submit">
          Create an account
        </Button>
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" data-testid="signup-login-link" className="font-semibold text-primary">
            Login
          </Link>
        </p>
      </form>
    </SplitPanel>
  );
}
