import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  className = '',
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-[var(--border)] bg-[var(--surface)] p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
