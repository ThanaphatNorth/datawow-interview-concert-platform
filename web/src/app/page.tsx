import Link from 'next/link';
import { SplitPanel } from '@/components/layout/SplitPanel';

// Server-rendered landing page (docs/01 §4.1). Public, nothing role-specific.
export default function LandingPage() {
  return (
    <SplitPanel>
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold">Free Concert Tickets</h1>
        <p className="text-[var(--text-muted)]">
          Browse upcoming concerts and reserve your free seat in seconds. One seat per concert,
          cancel anytime.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            data-testid="landing-login-link"
            className="inline-flex min-h-[44px] items-center justify-center rounded-input bg-primary px-6 py-3 font-semibold text-white transition hover:brightness-95"
          >
            Get free tickets
          </Link>
          <Link
            href="/register"
            data-testid="landing-register-link"
            className="inline-flex min-h-[44px] items-center justify-center rounded-input border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create an account
          </Link>
        </div>
      </div>
    </SplitPanel>
  );
}
