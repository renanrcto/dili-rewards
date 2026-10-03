import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AuthProvider, User, UserRole } from './entities/user.entity';

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
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  provider: AuthProvider;
  role: UserRole;
  emailVerified: boolean;
  blockedAt: Date | null;
  blockedReason: string | null;
  // null quando não bloqueada ou o super-admin já foi removido.
  blockedByName: string | null;
  createdAt: Date;
}

export interface PaginatedUsers {
  items: AdminUserItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
      // O e-mail vem do provedor, então a conta já nasce verificada.
      emailVerifiedAt: new Date(),
    });
    return this.usersRepository.save(user);
  }

  /** Contas mais recentes primeiro, filtradas por nome/e-mail e situação. */
  async list({
    search,
    status,
    page,
    limit,
  }: ListUsersQueryDto): Promise<PaginatedUsers> {
    const query = this.usersRepository
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.blockedBy', 'b');
    if (search) {
      // Escapa os curingas do LIKE para que "_" e "%" sejam literais.
      const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      query.andWhere('(u.name ILIKE :term OR u.email ILIKE :term)', { term });
    }
    if (status === 'pending') query.andWhere('u.email_verified_at IS NULL');
    if (status === 'blocked') query.andWhere('u.blocked_at IS NOT NULL');

    const [rows, total] = await query
      .orderBy('u.created_at', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: rows.map(toAdminUserItem),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async block(id: string, admin: User, reason: string): Promise<AdminUserItem> {
    const user = await this.findForAdmin(id);
    if (user.id === admin.id) {
      throw new BadRequestException('Você não pode bloquear a própria conta.');
    }
    // Evita que um super-admin tire outro do sistema; esse caso é tratado
    // direto no banco.
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Não é possível bloquear um super-admin.');
    }

    user.blockedAt = user.blockedAt ?? new Date();
    user.blockedReason = reason;
    user.blockedById = admin.id;
    user.blockedBy = admin;
    await this.usersRepository.save(user);
    return toAdminUserItem(user);
  }

  async unblock(id: string): Promise<AdminUserItem> {
    const user = await this.findForAdmin(id);
    user.blockedAt = null;
    user.blockedReason = null;
    user.blockedById = null;
    user.blockedBy = null;
    await this.usersRepository.save(user);
    return toAdminUserItem(user);
  }

  private async findForAdmin(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { blockedBy: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
}

function toAdminUserItem(user: User): AdminUserItem {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    role: user.role,
    emailVerified: !!user.emailVerifiedAt,
    blockedAt: user.blockedAt,
    blockedReason: user.blockedReason,
    blockedByName: user.blockedBy?.name ?? null,
    createdAt: user.createdAt,
  };
}
