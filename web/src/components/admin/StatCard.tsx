import type { ReactNode } from 'react';

type Tone = 'brand' | 'success' | 'danger';

const tones: Record<Tone, string> = {
  brand: 'bg-[var(--brand)]',
  success: 'bg-[var(--success)]',
  danger: 'bg-[var(--danger)]',
};

export function StatCard({
  label,
  value,
  icon,
  tone,
  testId,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: Tone;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`flex flex-col items-center gap-2 rounded-card px-6 py-7 text-white ${tones[tone]}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-base font-medium">{label}</span>
      <span data-testid={`${testId}-value`} className="text-4xl font-bold leading-none">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
