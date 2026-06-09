import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConcertCard } from '../ConcertCard';
import type { Concert } from '@/lib/types';

function makeConcert(overrides: Partial<Concert> = {}): Concert {
  return {
    id: 'c1',
    name: 'Summer Live',
    description: 'Open-air festival',
    totalSeats: 500,
    reservedSeats: 100,
    availableSeats: 400,
    soldOut: false,
    createdAt: '2026-06-10T00:00:00.000Z',
    myReservation: null,
    ...overrides,
  };
}

describe('ConcertCard (user variant)', () => {
  it('shows Reserve when seats remain and not reserved', async () => {
    const onReserve = jest.fn();
    render(<ConcertCard concert={makeConcert()} variant="user" onReserve={onReserve} />);

    const btn = screen.getByTestId('concert-reserve-btn');
    expect(btn).toBeInTheDocument();
    expect(screen.queryByTestId('concert-cancel-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('concert-soldout-badge')).not.toBeInTheDocument();

    await userEvent.click(btn);
    expect(onReserve).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('shows Cancel when the user holds an active reservation', async () => {
    const onCancel = jest.fn();
    const concert = makeConcert({ myReservation: { id: 'r1', status: 'ACTIVE' } });
    render(<ConcertCard concert={concert} variant="user" onCancel={onCancel} />);

    const btn = screen.getByTestId('concert-cancel-btn');
    expect(btn).toBeInTheDocument();
    expect(screen.queryByTestId('concert-reserve-btn')).not.toBeInTheDocument();

    await userEvent.click(btn);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });

  it('shows a disabled Sold out badge when full and not reserved', () => {
    const concert = makeConcert({ availableSeats: 0, reservedSeats: 500, soldOut: true });
    render(<ConcertCard concert={concert} variant="user" />);

    expect(screen.getByTestId('concert-soldout-badge')).toHaveTextContent(/sold out/i);
    expect(screen.queryByTestId('concert-reserve-btn')).not.toBeInTheDocument();
  });

  it('still shows Cancel for a reserved user even when sold out', () => {
    const concert = makeConcert({
      availableSeats: 0,
      reservedSeats: 500,
      soldOut: true,
      myReservation: { id: 'r1', status: 'ACTIVE' },
    });
    render(<ConcertCard concert={concert} variant="user" />);

    expect(screen.getByTestId('concert-cancel-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('concert-soldout-badge')).not.toBeInTheDocument();
  });

  it('renders seat count and title', () => {
    render(<ConcertCard concert={makeConcert()} variant="user" />);
    expect(screen.getByTestId('concert-seats')).toHaveTextContent('500');
    expect(screen.getByTestId('concert-title')).toHaveTextContent('Summer Live');
  });
});

describe('ConcertCard (admin variant)', () => {
  it('shows Delete and fires onDelete', async () => {
    const onDelete = jest.fn();
    render(<ConcertCard concert={makeConcert()} variant="admin" onDelete={onDelete} />);

    const btn = screen.getByTestId('concert-delete-btn');
    expect(btn).toBeInTheDocument();
    expect(screen.queryByTestId('concert-reserve-btn')).not.toBeInTheDocument();

    await userEvent.click(btn);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
  });
});
