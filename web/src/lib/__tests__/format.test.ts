import { formatDateTime } from '../format';

describe('formatDateTime', () => {
  it('formats an ISO timestamp as DD/MM/YYYY HH:mm:ss (zero-padded)', () => {
    // Build from local components so the assertion is timezone-independent.
    const d = new Date(2026, 5, 9, 7, 3, 5); // 9 Jun 2026, 07:03:05 local
    expect(formatDateTime(d.toISOString())).toBe('09/06/2026 07:03:05');
  });

  it('zero-pads single-digit day, month, hour, minute and second', () => {
    const d = new Date(2026, 0, 1, 0, 0, 0); // 1 Jan 2026, 00:00:00 local
    expect(formatDateTime(d.toISOString())).toBe('01/01/2026 00:00:00');
  });

  it('returns the raw input unchanged when it is not a valid date', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
