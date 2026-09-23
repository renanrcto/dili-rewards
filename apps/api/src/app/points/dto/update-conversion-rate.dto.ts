import { IsBoolean } from 'class-validator';

export class UpdateConversionRateDto {
  @IsBoolean()
  active!: boolean;
}
