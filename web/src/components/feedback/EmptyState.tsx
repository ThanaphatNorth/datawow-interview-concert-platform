import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  onRetry,
  testId,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** When set, renders a standard "Retry" button (used by all data-page error states). */
  onRetry?: () => void;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center"
    >
      <p className="text-lg font-semibold text-[var(--text)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold text-primary">
          Retry
        </button>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
