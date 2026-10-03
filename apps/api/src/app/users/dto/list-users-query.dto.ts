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

export const USER_STATUS_FILTERS = ['pending', 'blocked'] as const;
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number];

export class ListUsersQueryDto {
  // Parte do nome ou do e-mail.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  search?: string;

  // pending = e-mail não confirmado; blocked = bloqueadas. Sem filtro, todas.
  @IsOptional()
  @IsIn(USER_STATUS_FILTERS)
  status?: UserStatusFilter;

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
