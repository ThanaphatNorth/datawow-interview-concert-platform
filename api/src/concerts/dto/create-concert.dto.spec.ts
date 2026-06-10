import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateConcertDto } from './create-concert.dto';

async function errorsFor(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateConcertDto, payload);
  const errors = await validate(dto);
  // Flatten to the set of failing property names for easy assertions.
  return errors.map((e) => e.property);
}

describe('CreateConcertDto validation', () => {
  it('accepts a well-formed concert', async () => {
    expect(
      await errorsFor({ name: 'Summer Live', description: 'Open-air', totalSeats: 500 }),
    ).toEqual([]);
  });

  it('rejects an empty name', async () => {
    expect(await errorsFor({ name: '', description: 'd', totalSeats: 10 })).toContain('name');
  });

  it('rejects a name longer than 120 chars', async () => {
    expect(
      await errorsFor({ name: 'x'.repeat(121), description: 'd', totalSeats: 10 }),
    ).toContain('name');
  });

  it('rejects an empty description', async () => {
    expect(await errorsFor({ name: 'A', description: '', totalSeats: 10 })).toContain(
      'description',
    );
  });

  it('rejects zero or negative seats', async () => {
    expect(await errorsFor({ name: 'A', description: 'd', totalSeats: 0 })).toContain(
      'totalSeats',
    );
    expect(await errorsFor({ name: 'A', description: 'd', totalSeats: -5 })).toContain(
      'totalSeats',
    );
  });

  it('rejects a non-integer seat count', async () => {
    expect(await errorsFor({ name: 'A', description: 'd', totalSeats: 3.5 })).toContain(
      'totalSeats',
    );
  });
});
