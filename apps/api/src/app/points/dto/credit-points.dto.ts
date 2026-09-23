import { IsUUID } from 'class-validator';

export class CreditPointsDto {
  // Código do rescue_points lido no QR Code.
  @IsUUID()
  code!: string;
}
