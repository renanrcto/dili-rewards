import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConversionRateDto {
  @IsInt()
  @Min(1)
  pointsPerReal!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observation?: string;
}
