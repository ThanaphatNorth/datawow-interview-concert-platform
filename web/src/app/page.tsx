import Link from 'next/link';
import { ArrowRightIcon, WorkspaceIcon, AdminIcon } from '@/components/ui/icons';

// Server-rendered entry point (Figma: "Select Access Level"). The user picks a
// role, which routes to the matching login. Auth itself stays unified.
export default function SelectAccessLevelPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="flex items-center gap-2 bg-white px-6 py-4">
        <span className="h-4 w-4 rounded-full bg-primary" aria-hidden="true" />
        <span className="font-bold tracking-wide text-primary">BRAND</span>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Select Access Level</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Choose how you want to enter — browse and reserve as a user, or manage concerts as an
            administrator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* User card */}
          <article
            data-testid="access-user-card"
            className="flex flex-col gap-5 rounded-card border border-[var(--border)] bg-white p-8"
          >
            <span className="text-primary">
              <WorkspaceIcon width={48} height={48} />
            </span>
            <h2 className="text-2xl font-bold text-primary">User</h2>
            <p className="flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Discover upcoming concerts and reserve your free seat — one per concert. Cancel
              anytime and track your reservations.
            </p>
            <Link
              href="/login"
              data-testid="enter-workspace-btn"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-input bg-primary px-6 font-semibold text-white transition hover:brightness-95"
            >
              Enter Workspace
              <ArrowRightIcon width={18} height={18} />
            </Link>
          </article>

          {/* Administrator card */}
          <article
            data-testid="access-admin-card"
            className="flex flex-col gap-5 rounded-card bg-[var(--brand)] p-8 text-white"
          >
            <span>
              <AdminIcon width={48} height={48} />
            </span>
            <h2 className="text-2xl font-bold">Administrator</h2>
            <p className="flex-1 text-sm leading-relaxed text-white/80">
              Create and remove concerts, monitor seat and reservation stats, and audit the full
              reservation history of all users.
            </p>
            <Link
              href="/login/admin"
              data-testid="enter-portal-btn"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-input bg-white px-6 font-semibold text-primary transition hover:bg-white/90"
            >
              Enter Portal
              <ArrowRightIcon width={18} height={18} />
            </Link>
          </article>
        </div>
      </main>
    </div>
  );
}
