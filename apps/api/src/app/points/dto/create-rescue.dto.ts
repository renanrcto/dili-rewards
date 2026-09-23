import { IsNumber, IsPositive } from 'class-validator';

export class CreateRescueDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  purchaseAmount!: number;
}
