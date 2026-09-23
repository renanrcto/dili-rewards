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
