import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConversionRatesService } from './conversion-rates.service';
import { CreateRescueDto } from './dto/create-rescue.dto';
import { ListPointsQueryDto } from './dto/list-points-query.dto';
import { RescuePoint } from './entities/rescue-point.entity';
import { UserPoints } from './entities/user-points.entity';
import { TiersService } from './tiers.service';

export type PointsStatus = 'available' | 'redeemed' | 'expired';

export interface PointsBalance {
  balance: number;
}

export interface PointsHistoryItem {
  id: string;
  purchaseAmount: number;
  points: number;
  status: PointsStatus;
  redeemed: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface RescueCode {
  code: string;
  expiresAt: Date;
}

export interface DailyPointsItem {
  id: string;
  userName: string;
  purchaseAmount: number;
  points: number;
  createdAt: Date;
}

export interface DailyPointsReport {
  date: string;
  items: DailyPointsItem[];
  totals: { credits: number; purchaseAmount: number; points: number };
}

// Fuso da loja: define onde começa e termina "o dia" do painel.
const STORE_TIME_ZONE = 'America/Sao_Paulo';

export interface PaginatedPointsHistory {
  items: PointsHistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(UserPoints)
    private readonly pointsRepository: Repository<UserPoints>,
    @InjectRepository(RescuePoint)
    private readonly rescueRepository: Repository<RescuePoint>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly ratesService: ConversionRatesService,
    private readonly tiersService: TiersService,
  ) {}

  async createRescue(
    { purchaseAmount }: CreateRescueDto,
    adminId: string,
  ): Promise<RescueCode> {
    const saved = await this.rescueRepository.save(
      this.rescueRepository.create({ createdById: adminId, purchaseAmount }),
    );
    // expires_at vem do DEFAULT do banco (now() + 5 minutos).
    const row = await this.rescueRepository.findOneByOrFail({ id: saved.id });
    return { code: row.id, expiresAt: row.expiresAt };
  }

  // Resgata um código gerado pelo admin, creditando os pontos para o
  // usuário logado com a taxa de conversão vigente no momento do resgate.
  async credit(code: string, userId: string): Promise<PointsHistoryItem> {
    const rate = await this.ratesService.getCurrent();

    const savedId = await this.dataSource.transaction(async (manager) => {
      // Lock na linha do código: duas leituras simultâneas do mesmo QR
      // Code são serializadas e a segunda já enxerga o crédito da primeira.
      const rescue = await manager.findOne(RescuePoint, {
        where: { id: code },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rescue) {
        throw new NotFoundException('Código de resgate inválido');
      }
      if (await manager.existsBy(UserPoints, { rescuePointId: rescue.id })) {
        throw new ConflictException('Este código já foi resgatado');
      }
      if (rescue.expiresAt <= new Date()) {
        throw new GoneException('Este código de resgate expirou');
      }

      // Conta em centavos para evitar erro de ponto flutuante
      // (ex.: 0.29 * 100 = 28.999...). Frações de ponto são descartadas.
      const cents = Math.round(rescue.purchaseAmount * 100);
      const points = Math.floor((cents * rate.pointsPerReal) / 100);
      if (points < 1) {
        throw new BadRequestException(
          'Valor da compra insuficiente para gerar pontos',
        );
      }

      const saved = await manager.save(
        manager.create(UserPoints, {
          userId,
          creditedById: rescue.createdById,
          rescuePointId: rescue.id,
          conversionRateId: rate.id,
          purchaseAmount: rescue.purchaseAmount,
          points,
        }),
      );
      await this.tiersService.recordCredit(manager, userId, points);
      return saved.id;
    });
    // created_at/expires_at vêm dos DEFAULTs do banco; o save do TypeORM
    // só devolve o que ele próprio gerou, então relemos a linha.
    const row = await this.pointsRepository.findOneByOrFail({ id: savedId });
    return this.toHistoryItem(row, new Date());
  }

  async getBalance(userId: string): Promise<PointsBalance> {
    // Expiração comparada com now() do banco — mesma fonte de tempo usada
    // no DEFAULT de expires_at.
    const row = await this.pointsRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.points), 0)', 'balance')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.redeemed = false')
      .andWhere('p.expires_at > now()')
      .getRawOne<{ balance: string }>();

    // SUM de integer vem como bigint (string) do driver pg.
    return { balance: Number(row?.balance ?? 0) };
  }

  async getHistory(
    userId: string,
    { page, limit }: ListPointsQueryDto,
  ): Promise<PaginatedPointsHistory> {
    const [rows, total] = await this.pointsRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const now = new Date();
    return {
      items: rows.map((row) => this.toHistoryItem(row, now)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Painel do super-admin: todos os créditos de um dia (padrão: hoje no
  // fuso da loja), mais recentes primeiro.
  async getDailyCredits(date?: string): Promise<DailyPointsReport> {
    const day = date ?? (await this.storeToday());

    // Intervalo em timestamptz (e não um cast da coluna) para aproveitar
    // índices em created_at. CAST em vez de "::" para não confundir o
    // parser de parâmetros do TypeORM.
    const rows = await this.pointsRepository
      .createQueryBuilder('p')
      .innerJoin('p.user', 'u')
      .select('p.id', 'id')
      .addSelect('u.name', 'userName')
      .addSelect('p.purchase_amount', 'purchaseAmount')
      .addSelect('p.points', 'points')
      .addSelect('p.created_at', 'createdAt')
      .where(
        `p.created_at >= CAST(CAST(:day AS date) AS timestamp) AT TIME ZONE :tz`,
      )
      .andWhere(
        `p.created_at < CAST(CAST(:day AS date) + 1 AS timestamp) AT TIME ZONE :tz`,
      )
      .setParameters({ day, tz: STORE_TIME_ZONE })
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .getRawMany<{
        id: string;
        userName: string;
        purchaseAmount: string;
        points: number;
        createdAt: Date;
      }>();

    // numeric vem como string do driver pg.
    const items = rows.map((row) => ({
      ...row,
      purchaseAmount: Number(row.purchaseAmount),
    }));
    // Soma em centavos para não acumular erro de ponto flutuante.
    const totalCents = items.reduce(
      (sum, item) => sum + Math.round(item.purchaseAmount * 100),
      0,
    );

    return {
      date: day,
      items,
      totals: {
        credits: items.length,
        purchaseAmount: totalCents / 100,
        points: items.reduce((sum, item) => sum + item.points, 0),
      },
    };
  }

  private async storeToday(): Promise<string> {
    const [row] = await this.dataSource.query<{ today: string }[]>(
      `SELECT to_char(now() AT TIME ZONE $1, 'YYYY-MM-DD') AS today`,
      [STORE_TIME_ZONE],
    );
    return row.today;
  }

  private toHistoryItem(row: UserPoints, now: Date): PointsHistoryItem {
    let status: PointsStatus = 'available';
    if (row.redeemed) status = 'redeemed';
    else if (row.expiresAt <= now) status = 'expired';

    return {
      id: row.id,
      purchaseAmount: row.purchaseAmount,
      points: row.points,
      status,
      redeemed: row.redeemed,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }
}
