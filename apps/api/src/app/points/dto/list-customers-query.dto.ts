import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CUSTOMER_SORTS = ['recent', 'visits', 'points'] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export class ListCustomersQueryDto {
  // Parte do nome ou do e-mail.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  search?: string;

  // recent = cadastro mais recente; visits/points = maiores primeiro.
  @IsOptional()
  @IsIn(CUSTOMER_SORTS)
  sort: CustomerSort = 'recent';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}
