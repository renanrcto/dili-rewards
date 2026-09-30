import { IsEnum, IsOptional } from 'class-validator';
import { StoreUnit } from '../../../config/store.config';

export class CurrentRateQueryDto {
  // Sem unidade, só as taxas que valem para todas (padrão).
  @IsOptional()
  @IsEnum(StoreUnit)
  unit?: StoreUnit;
}
