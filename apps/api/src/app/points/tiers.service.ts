import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserPoints } from './entities/user-points.entity';
import { GrantedTier, TierSource, UserTier } from './entities/user-tier.entity';

export type TierLevel = 'standard' | GrantedTier;

export interface UserTierStatus {
  tier: TierLevel;
  // De onde vem o nível vigente: garantia por subida ('activity'), nível
  // forçado ('manual') ou null quando vem só da atividade atual/standard.
  source: TierSource | null;
  // Até quando o nível está garantido; null se não há garantia ou se é
  // manual (vale até ser revogado).
  lockedUntil: Date | null;
  // Visitas (créditos de pontos) e pontos acumulados em ACTIVITY_WINDOW,
  // contando também os já utilizados ou expirados.
  visits: number;
  points: number;
  since: Date;
}

interface Activity {
  visits: number;
  points: number;
  since: Date;
}

// Janela móvel da regra de visitas/pontos e por quanto tempo a subida de
// nível fica garantida (intervalos do Postgres).
const ACTIVITY_WINDOW = '2 months';
const TIER_LOCK = '3 months';

// Basta cumprir um dos critérios (visitas OU pontos) para subir de nível.
// Ordenado do mais alto para o mais baixo; limites exclusivos ("mais de").
const TIER_RULES: {
  tier: GrantedTier;
  minVisits: number;
  minPoints: number;
}[] = [
  { tier: GrantedTier.PLATINUM, minVisits: 15, minPoints: 200_000 },
  { tier: GrantedTier.GOLD, minVisits: 10, minPoints: 100_000 },
];

const TIER_RANK: Record<TierLevel, number> = {
  standard: 0,
  [GrantedTier.GOLD]: 1,
  [GrantedTier.PLATINUM]: 2,
};

function tierFor({ visits, points }: Pick<Activity, 'visits' | 'points'>) {
  const rule = TIER_RULES.find(
    (r) => visits > r.minVisits || points > r.minPoints,
  );
  return rule?.tier ?? 'standard';
}

@Injectable()
export class TiersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getStatus(userId: string): Promise<UserTierStatus> {
    const manager = this.dataSource.manager;
    const [activity, grant] = await Promise.all([
      this.getActivity(manager, userId),
      this.getBestActiveGrant(manager, userId),
    ]);

    const activityTier = tierFor(activity);
    // Empate fica com a garantia, que informa até quando o nível vale.
    if (grant && TIER_RANK[grant.tier] >= TIER_RANK[activityTier]) {
      return {
        ...activity,
        tier: grant.tier,
        source: grant.source,
        lockedUntil: grant.lockedUntil,
      };
    }
    return { ...activity, tier: activityTier, source: null, lockedUntil: null };
  }

  // Chamado na mesma transação do crédito, depois de gravar o UserPoints.
  // Se o crédito fez o usuário subir acima do nível que já tinha, grava a
  // garantia do novo nível por TIER_LOCK.
  async recordCredit(
    manager: EntityManager,
    userId: string,
    creditedPoints: number,
  ): Promise<void> {
    // Serializa créditos simultâneos do mesmo usuário: sem isso, duas
    // transações poderiam não enxergar o crédito uma da outra e perder a
    // subida de nível.
    await manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });

    const after = await this.getActivity(manager, userId);
    const before = {
      visits: after.visits - 1,
      points: after.points - creditedPoints,
    };
    const grant = await this.getBestActiveGrant(manager, userId);

    const previousRank = Math.max(
      TIER_RANK[tierFor(before)],
      grant ? TIER_RANK[grant.tier] : 0,
    );
    const next = tierFor(after);
    if (next === 'standard' || TIER_RANK[next] <= previousRank) return;

    await manager
      .createQueryBuilder()
      .insert()
      .into(UserTier)
      .values({
        userId,
        tier: next,
        source: TierSource.ACTIVITY,
        lockedUntil: () => `now() + interval '${TIER_LOCK}'`,
      })
      .execute();
  }

  private async getActivity(
    manager: EntityManager,
    userId: string,
  ): Promise<Activity> {
    const row = await manager
      .createQueryBuilder(UserPoints, 'p')
      .select('COUNT(*)', 'visits')
      .addSelect('COALESCE(SUM(p.points), 0)', 'points')
      .addSelect(`now() - interval '${ACTIVITY_WINDOW}'`, 'since')
      .where('p.user_id = :userId', { userId })
      .andWhere(`p.created_at > now() - interval '${ACTIVITY_WINDOW}'`)
      .getRawOne<{ visits: string; points: string; since: Date }>();

    // COUNT/SUM vêm como bigint (string) do driver pg.
    return {
      visits: Number(row?.visits ?? 0),
      points: Number(row?.points ?? 0),
      since: row?.since ?? new Date(),
    };
  }

  // Maior nível entre as garantias vigentes (não revogadas e dentro do
  // prazo). No empate, manual ganha e depois a que vale por mais tempo.
  private getBestActiveGrant(
    manager: EntityManager,
    userId: string,
  ): Promise<UserTier | null> {
    return (
      manager
        .createQueryBuilder(UserTier, 't')
        .where('t.user_id = :userId', { userId })
        .andWhere('t.revoked_at IS NULL')
        .andWhere('(t.locked_until IS NULL OR t.locked_until > now())')
        // Ordem do enum no Postgres: gold < platinum.
        .orderBy('t.tier', 'DESC')
        .addOrderBy('t.lockedUntil', 'DESC', 'NULLS FIRST')
        .getOne()
    );
  }
}
