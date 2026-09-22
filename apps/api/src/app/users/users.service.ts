import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthProvider, User } from './entities/user.entity';

export interface CreateLocalUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface CreateSocialUserInput {
  name: string;
  email: string;
  provider: AuthProvider.GOOGLE | AuthProvider.APPLE;
  providerId: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByProviderId(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.usersRepository.findOne({ where: { provider, providerId } });
  }

  createLocalUser(input: CreateLocalUserInput): Promise<User> {
    const user = this.usersRepository.create({
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      provider: AuthProvider.LOCAL,
    });
    return this.usersRepository.save(user);
  }

  createSocialUser(input: CreateSocialUserInput): Promise<User> {
    const user = this.usersRepository.create({
      name: input.name,
      email: input.email,
      provider: input.provider,
      providerId: input.providerId,
      avatarUrl: input.avatarUrl ?? null,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
    });
    return this.usersRepository.save(user);
  }
}
