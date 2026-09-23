import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import type { AuthResult, PublicUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('google')
  loginWithGoogle(@Body() dto: SocialLoginDto): Promise<AuthResult> {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  // Login com Apple desativado — por enquanto só login local e Google.
  // @HttpCode(HttpStatus.OK)
  // @Post('apple')
  // loginWithApple(@Body() dto: SocialLoginDto): Promise<AuthResult> {
  //   return this.authService.loginWithApple(dto.idToken);
  // }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User): PublicUser {
    return this.authService.toPublicUser(user);
  }
}
