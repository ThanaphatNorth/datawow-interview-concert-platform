import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReservationAction } from '@prisma/client';
import { ListEventsDto } from './list-events.dto';

async function validateRaw(payload: Record<string, unknown>) {
  // enableImplicitConversion is off; @Type(() => Number) handles query-string coercion.
  const dto = plainToInstance(ListEventsDto, payload);
  const errors = await validate(dto);
  return { dto, props: errors.map((e) => e.property) };
}

describe('ListEventsDto validation', () => {
  it('applies defaults (page=1, pageSize=20) when omitted', () => {
    const dto = plainToInstance(ListEventsDto, {});
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
  });

  it('coerces numeric query strings to integers', async () => {
    const { dto, props } = await validateRaw({ page: '3', pageSize: '50' });
    expect(props).toEqual([]);
    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
  });

  it('accepts a valid action enum value', async () => {
    const { props } = await validateRaw({ action: ReservationAction.CANCEL });
    expect(props).toEqual([]);
  });

  it('rejects an unknown action value', async () => {
    const { props } = await validateRaw({ action: 'NOPE' });
    expect(props).toContain('action');
  });

  it('rejects page < 1', async () => {
    const { props } = await validateRaw({ page: '0' });
    expect(props).toContain('page');
  });

  it('rejects pageSize > 100', async () => {
    const { props } = await validateRaw({ pageSize: '101' });
    expect(props).toContain('pageSize');
  });
});
