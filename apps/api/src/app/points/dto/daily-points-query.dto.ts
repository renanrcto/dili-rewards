import { IsDateString, IsOptional, Matches } from 'class-validator';

export class DailyPointsQueryDto {
  // Dia no fuso da loja (YYYY-MM-DD); padrão: hoje.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use o formato AAAA-MM-DD.' })
  @IsDateString({ strict: true })
  date?: string;
}
