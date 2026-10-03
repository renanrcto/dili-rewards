import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CustomerSort,
  ListCustomersQueryDto,
} from './dto/list-customers-query.dto';
import { UserPoints } from './entities/user-points.entity';
import { GrantedTier, UserTier } from './entities/user-tier.entity';
import { ACTIVITY_WINDOW, currentTier, TierLevel } from './tiers.service';

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  // Visitas = créditos de pontos (QR Codes lidos), desde o cadastro.
  visits: number;
  // Soma de todos os pontos já ganhos, incluindo usados e expirados.
  totalPoints: number;
  // Pontos disponíveis hoje (nem usados nem expirados).
  balance: number;
  tier: TierLevel;
}

export interface PaginatedCustomers {
  items: CustomerItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Expressões fixas (nunca vindas do request) para o ORDER BY.
const SORT_COLUMNS: Record<CustomerSort, string> = {
  recent: '"createdAt"',
  visits: '"visits"',
  points: '"totalPoints"',
};

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  // COUNT/SUM vêm como bigint (string) do driver pg.
  visits: string;
  totalPoints: string;
  balance: string;
  recentVisits: string;
  recentPoints: string;
  grantedTier: GrantedTier | null;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Todas as contas com visitas, pontos e nível — numa consulta só, em vez
   * de chamar o TiersService para cada usuário da página.
   */
  async list({
    search,
    sort,
    page,
    limit,
  }: ListCustomersQueryDto): Promise<PaginatedCustomers> {
    const users = this.dataSource.getRepository(User);
    // Mesmo filtro na página e na contagem (que não precisa dos joins).
    const filtered = (alias: string) => {
      const qb = users.createQueryBuilder(alias);
      if (search) {
        // Escapa os curingas do LIKE para que "_" e "%" sejam literais.
        const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
        qb.where(`(${alias}.name ILIKE :term OR ${alias}.email ILIKE :term)`, {
          term,
        });
      }
      return qb;
    };

    const query = filtered('u')
      .leftJoin(UserPoints, 'p', 'p.user_id = u.id')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('u.role', 'role')
      .addSelect('u.created_at', 'createdAt')
      .addSelect('COUNT(p.id)', 'visits')
      .addSelect('COALESCE(SUM(p.points), 0)', 'totalPoints')
      // Mesma regra do saldo do cliente (PointsService.getBalance).
      .addSelect(
        'COALESCE(SUM(p.points) FILTER (WHERE p.redeemed = false AND p.expires_at > now()), 0)',
        'balance',
      )
      // Atividade da janela do nível (TiersService.getActivity).
      .addSelect(
        `COUNT(p.id) FILTER (WHERE p.created_at > now() - interval '${ACTIVITY_WINDOW}')`,
        'recentVisits',
      )
      .addSelect(
        `COALESCE(SUM(p.points) FILTER (WHERE p.created_at > now() - interval '${ACTIVITY_WINDOW}'), 0)`,
        'recentPoints',
      )
      // Melhor garantia vigente; MAX segue a ordem do enum (gold < platinum
      // < black), como no TiersService.getBestActiveGrant.
      .addSelect(
        (sub) =>
          sub
            .select('MAX(t.tier)')
            .from(UserTier, 't')
            .where('t.user_id = u.id')
            .andWhere('t.revoked_at IS NULL')
            .andWhere('(t.locked_until IS NULL OR t.locked_until > now())'),
        'grantedTier',
      )
      .groupBy('u.id');

    const [rows, total] = await Promise.all([
      query
        .orderBy(SORT_COLUMNS[sort], 'DESC')
        .addOrderBy('u.id', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<CustomerRow>(),
      filtered('c').getCount(),
    ]);

    return {
      items: rows.map(toCustomerItem),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

function toCustomerItem(row: CustomerRow): CustomerItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    visits: Number(row.visits),
    totalPoints: Number(row.totalPoints),
    balance: Number(row.balance),
    tier: currentTier(
      { visits: Number(row.recentVisits), points: Number(row.recentPoints) },
      row.grantedTier,
    ),
  };
}
