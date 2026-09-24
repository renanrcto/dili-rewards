import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
