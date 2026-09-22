import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
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
