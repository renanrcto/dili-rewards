import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { StoreUnit } from '../../../config/store.config';

export class CreateConversionRateDto {
  @IsInt()
  @Min(1)
  pointsPerReal!: number;

  // Duração da taxa promocional; sem ela a taxa vira a nova padrão.
  // Máximo de 30 dias.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  durationHours?: number;

  // Unidade da promoção: obrigatória com durationHours. A taxa padrão
  // vale para todas as unidades.
  @ValidateIf((dto: CreateConversionRateDto) => dto.durationHours !== undefined)
  @IsEnum(StoreUnit)
  unit?: StoreUnit;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
