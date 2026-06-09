'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  testId: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, testId, id, rows = 4, ...rest },
  ref,
) {
  const fieldId = id ?? testId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-base font-medium text-[var(--text)]">
        {label}
      </label>
      <textarea
        id={fieldId}
        ref={ref}
        rows={rows}
        data-testid={testId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-input border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          error ? 'border-danger' : 'border-slate-300'
        }`}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} data-testid={`${testId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
