import { Matches } from 'class-validator';

export class ConfirmEmailDto {
  @Matches(/^\d{6}$/, { message: 'O código tem 6 números.' })
  code!: string;
}
