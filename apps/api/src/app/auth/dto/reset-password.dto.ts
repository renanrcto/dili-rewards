import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MaxLength(128)
  token!: string;

  // Mesmas regras do cadastro (72 = limite de bytes do bcrypt).
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
