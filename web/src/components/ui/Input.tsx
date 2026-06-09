'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leadingIcon?: ReactNode;
  /** Decorative icon pinned to the right edge (ignored when passwordToggle is set). */
  trailingIcon?: ReactNode;
  /** When true, renders a show/hide eye toggle and a password input. */
  passwordToggle?: boolean;
  testId: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, leadingIcon, trailingIcon, passwordToggle, testId, type = 'text', id, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const inputId = id ?? testId;
  const resolvedType = passwordToggle ? (show ? 'text' : 'password') : type;
  const hasTrailing = passwordToggle || !!trailingIcon;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-base font-medium text-[var(--text)]">
        {label}
      </label>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          type={resolvedType}
          data-testid={testId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`min-h-[44px] w-full rounded-input border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            leadingIcon ? 'pl-10' : ''
          } ${hasTrailing ? 'pr-10' : ''} ${error ? 'border-danger' : 'border-slate-300'}`}
          {...rest}
        />
        {trailingIcon && !passwordToggle && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            {trailingIcon}
          </span>
        )}
        {passwordToggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            data-testid={`${testId}-toggle`}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          >
            {show ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} data-testid={`${testId}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
