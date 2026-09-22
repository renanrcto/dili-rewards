import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthProvider, User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 12;
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: AuthProvider;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly appleJwksClient = jwksClient({ jwksUri: APPLE_JWKS_URI });

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.createLocalUser({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.buildAuthResult(user);
  }

  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token do Google inválido.');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token do Google inválido.');
    }

    const user = await this.findOrCreateSocialUser({
      provider: AuthProvider.GOOGLE,
      providerId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      avatarUrl: payload.picture ?? null,
      emailVerified: payload.email_verified ?? false,
    });

    return this.buildAuthResult(user);
  }

  async loginWithApple(idToken: string): Promise<AuthResult> {
    const audience = this.configService.get<string>('APPLE_CLIENT_ID');
    const decoded = jwt.decode(idToken, { complete: true });
    const kid = decoded && typeof decoded === 'object' ? decoded.header.kid : undefined;
    if (!kid) {
      throw new UnauthorizedException('Token da Apple inválido.');
    }

    let signingKey: string;
    try {
      const key = await this.appleJwksClient.getSigningKey(kid);
      signingKey = key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Token da Apple inválido.');
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(idToken, signingKey, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience,
      }) as jwt.JwtPayload;
    } catch {
      throw new UnauthorizedException('Token da Apple inválido.');
    }

    const email = payload.email as string | undefined;
    if (!payload.sub || !email) {
      throw new UnauthorizedException('Token da Apple inválido.');
    }

    const user = await this.findOrCreateSocialUser({
      provider: AuthProvider.APPLE,
      providerId: payload.sub,
      email,
      // A Apple só envia o nome no primeiro consentimento (fora do
      // id_token, num campo separado que o front deveria repassar); como
      // fallback simples usamos o e-mail.
      name: email,
      avatarUrl: null,
      emailVerified:
        payload.email_verified === true || payload.email_verified === 'true',
    });

    return this.buildAuthResult(user);
  }

  private async findOrCreateSocialUser(input: {
    provider: AuthProvider.GOOGLE | AuthProvider.APPLE;
    providerId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  }): Promise<User> {
    const existingByProvider = await this.usersService.findByProviderId(
      input.provider,
      input.providerId,
    );
    if (existingByProvider) {
      return existingByProvider;
    }

    const existingByEmail = await this.usersService.findByEmail(input.email);
    if (existingByEmail) {
      throw new ConflictException(
        'Já existe uma conta com este e-mail cadastrada com outro método de login.',
      );
    }

    return this.usersService.createSocialUser({
      name: input.name,
      email: input.email,
      provider: input.provider,
      providerId: input.providerId,
      avatarUrl: input.avatarUrl,
      emailVerified: input.emailVerified,
    });
  }

  private buildAuthResult(user: User): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.toPublicUser(user),
    };
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
    };
  }
}
