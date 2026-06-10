'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Client-side route guard (convenience only — backend Guards are authoritative,
 * docs/01 §3). Unauthenticated → /login. Wrong role → /concerts + toast.
 */
export function RoleGate({ allow, children }: { allow?: Role; children: ReactNode }) {
  const router = useRouter();
  const { isReady, isAuthenticated, role, user } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    // A provisioned admin must finish setting a password before any portal page.
    if (user?.mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    if (allow && role !== allow) {
      toast.error("You don't have permission to view that page");
      router.replace('/concerts');
    }
  }, [isReady, isAuthenticated, role, user, allow, router]);

  if (
    !isReady ||
    !isAuthenticated ||
    user?.mustChangePassword ||
    (allow && role !== allow)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <>{children}</>;
}
