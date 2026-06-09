import type { ApiError } from './types';
import { getToken, clearSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface BackendError {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

/**
 * Maps a validation message like "totalSeats must be a positive number"
 * onto a form field name when the leading word matches a known field.
 */
const KNOWN_FIELDS = ['name', 'email', 'password', 'description', 'totalSeats'];

function toFieldErrors(messages: string[]): Record<string, string> | undefined {
  const fieldErrors: Record<string, string> = {};
  for (const msg of messages) {
    const firstWord = msg.trim().split(/\s+/)[0];
    if (KNOWN_FIELDS.includes(firstWord)) {
      fieldErrors[firstWord] = msg;
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: BackendError = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }

  const rawMessage = body.message;
  let message: string;
  let fieldErrors: Record<string, string> | undefined;

  if (Array.isArray(rawMessage)) {
    message = rawMessage[0] ?? 'Request failed';
    fieldErrors = res.status === 400 ? toFieldErrors(rawMessage) : undefined;
  } else if (typeof rawMessage === 'string') {
    message = rawMessage;
  } else {
    message = body.error ?? res.statusText ?? 'Request failed';
  }

  return { status: res.status, message, fieldErrors };
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });

  if (!res.ok) {
    const err = await toApiError(res);
    // On 401 the session is stale: clear it. Redirect is handled by callers / providers.
    if (err.status === 401) {
      clearSession();
    }
    throw err;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    'message' in e &&
    typeof (e as ApiError).status === 'number'
  );
}
