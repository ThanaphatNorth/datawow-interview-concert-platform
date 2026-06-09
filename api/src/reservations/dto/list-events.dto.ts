import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReservationAction } from '@prisma/client';

export class ListEventsDto {
  @IsOptional()
  @IsString()
  concertId?: string;

  @IsOptional()
  @IsEnum(ReservationAction)
  action?: ReservationAction;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
