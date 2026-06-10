import toast from 'react-hot-toast';
import { applyFieldErrors, handleApiError } from '../error-handler';
import type { ApiError } from '../types';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockToastError = (toast as unknown as { error: jest.Mock }).error;

describe('applyFieldErrors', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps each server field error onto the form and returns true', () => {
    const setError = jest.fn();
    const err: ApiError = {
      status: 400,
      message: 'Validation failed',
      fieldErrors: { name: 'Required', totalSeats: 'Must be > 0' },
    };

    expect(applyFieldErrors(err, setError as any)).toBe(true);
    expect(setError).toHaveBeenCalledWith('name', { message: 'Required' });
    expect(setError).toHaveBeenCalledWith('totalSeats', { message: 'Must be > 0' });
  });

  it('returns false for a non-ApiError', () => {
    const setError = jest.fn();
    expect(applyFieldErrors(new Error('x'), setError as any)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('returns false when the ApiError has no fieldErrors', () => {
    const setError = jest.fn();
    const err: ApiError = { status: 400, message: 'Bad' };
    expect(applyFieldErrors(err, setError as any)).toBe(false);
  });
});

describe('handleApiError', () => {
  beforeEach(() => jest.clearAllMocks());

  it('toasts the fallback for a non-ApiError', () => {
    handleApiError(new Error('boom'), 'Custom fallback');
    expect(mockToastError).toHaveBeenCalledWith('Custom fallback');
  });

  it('toasts the 400 message only when there are no fieldErrors', () => {
    handleApiError({ status: 400, message: 'Bad input' } as ApiError);
    expect(mockToastError).toHaveBeenCalledWith('Bad input');
  });

  it('stays silent on a 400 with fieldErrors (form handles it)', () => {
    handleApiError({ status: 400, message: 'x', fieldErrors: { a: 'b' } } as ApiError);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows a session-expired message on 401', () => {
    handleApiError({ status: 401, message: 'Unauthorized' } as ApiError);
    expect(mockToastError).toHaveBeenCalledWith('Session expired. Please log in again.');
  });

  it('shows a permission message on 403', () => {
    handleApiError({ status: 403, message: 'Forbidden' } as ApiError);
    expect(mockToastError).toHaveBeenCalledWith("You don't have permission to do that");
  });

  it('shows the message on 404 (with a default)', () => {
    handleApiError({ status: 404, message: '' } as ApiError);
    expect(mockToastError).toHaveBeenCalledWith('Not found');
  });

  it('shows the conflict message on 409', () => {
    handleApiError({ status: 409, message: 'Already reserved' } as ApiError);
    expect(mockToastError).toHaveBeenCalledWith('Already reserved');
  });

  it('falls back for unexpected status codes', () => {
    handleApiError({ status: 500, message: '' } as ApiError, 'Server fallback');
    expect(mockToastError).toHaveBeenCalledWith('Server fallback');
  });
});
