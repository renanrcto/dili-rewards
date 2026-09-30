import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { StoreUnit } from '../../../config/store.config';

export class CreateRescueDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  purchaseAmount!: number;

  @IsEnum(StoreUnit)
  unit!: StoreUnit;
}
