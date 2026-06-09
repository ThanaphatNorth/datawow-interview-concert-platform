'use client';

import toast from 'react-hot-toast';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from './api-client';

/**
 * Attaches server-side 400 field errors onto a react-hook-form. Returns true when
 * field errors were present and applied, so callers can skip the generic toast.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!isApiError(error) || !error.fieldErrors) return false;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    setError(field as Path<T>, { message });
  }
  return true;
}

/**
 * Surfaces an API error per 03-integration-spec §4. Returns true when the error
 * was fully handled (toasted); callers may still map 400 fieldErrors to forms.
 */
export function handleApiError(error: unknown, fallback = 'Something went wrong'): void {
  if (!isApiError(error)) {
    toast.error(fallback);
    return;
  }

  switch (error.status) {
    case 400:
      // Field errors are mapped onto forms by the caller; toast remaining message.
      if (!error.fieldErrors) toast.error(error.message);
      break;
    case 401:
      toast.error('Session expired. Please log in again.');
      break;
    case 403:
      toast.error("You don't have permission to do that");
      break;
    case 404:
      toast.error(error.message || 'Not found');
      break;
    case 409:
      toast.error(error.message);
      break;
    default:
      toast.error(error.message || fallback);
  }
}
