import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConcertForm } from '../ConcertForm';

describe('ConcertForm validation', () => {
  it('blocks submit and shows inline errors when empty', async () => {
    const onSubmit = jest.fn();
    render(<ConcertForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByTestId('concert-save-btn'));

    expect(await screen.findByTestId('concert-name-input-error')).toHaveTextContent(/required/i);
    expect(screen.getByTestId('concert-description-input-error')).toHaveTextContent(/required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects non-positive seat counts', async () => {
    const onSubmit = jest.fn();
    render(<ConcertForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId('concert-name-input'), 'Summer Live');
    await userEvent.type(screen.getByTestId('concert-description-input'), 'Open-air');
    await userEvent.type(screen.getByTestId('concert-seats-input'), '0');
    await userEvent.click(screen.getByTestId('concert-save-btn'));

    expect(await screen.findByTestId('concert-seats-input-error')).toHaveTextContent(/> 0/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits coerced values when valid', async () => {
    const onSubmit = jest.fn();
    render(<ConcertForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId('concert-name-input'), 'Summer Live');
    await userEvent.type(screen.getByTestId('concert-description-input'), 'Open-air festival');
    await userEvent.type(screen.getByTestId('concert-seats-input'), '500');
    await userEvent.click(screen.getByTestId('concert-save-btn'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Summer Live',
        description: 'Open-air festival',
        totalSeats: 500,
      }),
      expect.anything(),
    );
  });

  it('surfaces server field errors', () => {
    render(<ConcertForm onSubmit={jest.fn()} serverFieldErrors={{ name: 'Name already taken' }} />);
    expect(screen.getByTestId('concert-name-input-error')).toHaveTextContent('Name already taken');
  });
});
