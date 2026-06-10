import { apiFetch, isApiError } from '../api-client';
import { getToken, clearSession } from '../auth';
import type { ApiError } from '../types';

jest.mock('../auth', () => ({
  getToken: jest.fn(),
  clearSession: jest.fn(),
}));

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockClearSession = clearSession as jest.MockedFunction<typeof clearSession>;

function jsonResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    statusText: 'STATUS_TEXT',
    json: async () => body,
  } as unknown as Response;
}

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('attaches the bearer token and JSON content-type when a token exists', async () => {
    mockGetToken.mockReturnValue('tok123');
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ ok: true }));

    await apiFetch('/concerts');

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://localhost:4000/concerts');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer tok123');
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('omits Authorization when there is no token', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse([]));

    await apiFetch('/concerts');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect((opts.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('returns parsed JSON on success', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse([{ id: 'c1' }]));

    await expect(apiFetch('/concerts')).resolves.toEqual([{ id: 'c1' }]);
  });

  it('returns undefined for a 204 No Content', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(null, { status: 204 }));

    await expect(apiFetch('/reservations/r1')).resolves.toBeUndefined();
  });

  it('throws a normalized ApiError using a string message', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ statusCode: 409, message: 'Concert is sold out' }, { status: 409 }),
    );

    await expect(apiFetch('/concerts/c1/reservations', { method: 'POST' })).rejects.toEqual({
      status: 409,
      message: 'Concert is sold out',
      fieldErrors: undefined,
    });
  });

  it('uses the first entry when message is a validation string[]', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(
        { message: ['name should not be empty', 'seats must be positive'] },
        { status: 400 },
      ),
    );

    await expect(apiFetch('/concerts', { method: 'POST' })).rejects.toMatchObject({
      status: 400,
      message: 'name should not be empty',
    });
  });

  it('carries fieldErrors through to the thrown error', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(
        { message: 'Validation failed', fieldErrors: { name: 'Required' } },
        { status: 400 },
      ),
    );

    await expect(apiFetch('/concerts', { method: 'POST' })).rejects.toMatchObject({
      fieldErrors: { name: 'Required' },
    });
  });

  it('clears the session on a 401', async () => {
    mockGetToken.mockReturnValue('stale');
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ message: 'Unauthorized' }, { status: 401 }),
    );

    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to statusText when the error body is not JSON', async () => {
    mockGetToken.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    await expect(apiFetch('/concerts')).rejects.toMatchObject({
      status: 500,
      message: 'Server Error',
    });
  });
});

describe('isApiError', () => {
  it('recognizes a well-formed ApiError', () => {
    const err: ApiError = { status: 404, message: 'Not found' };
    expect(isApiError(err)).toBe(true);
  });

  it('rejects non-errors and plain Error objects', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ status: '404', message: 'x' })).toBe(false);
  });
});
