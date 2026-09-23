import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  // Normaliza espaços para que "  Ana   Bispo " vire "Ana Bispo".
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  // Exige nome e sobrenome: ao menos duas palavras começando por letra.
  @Matches(/^\p{L}[\p{L}'.-]*(?: [\p{L}'.-]+)* \p{L}[\p{L}'.-]*$/u, {
    message: 'Informe seu nome e sobrenome.',
  })
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  // 72 = limite de bytes que o bcrypt efetivamente considera.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
