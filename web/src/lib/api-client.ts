import type { ApiError } from './types';
import { getToken, clearSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface BackendError {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  /** Structured field->message map emitted by the API's ValidationPipe. */
  fieldErrors?: Record<string, string>;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: BackendError = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error body
  }

  const rawMessage = body.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage[0] ?? 'Request failed'
    : typeof rawMessage === 'string'
      ? rawMessage
      : body.error ?? res.statusText ?? 'Request failed';

  return { status: res.status, message, fieldErrors: body.fieldErrors };
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
