import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { StoreUnit } from '../../config/store.config';
import { CreateConversionRateDto } from './dto/create-conversion-rate.dto';
import { PointsConversionRate } from './entities/points-conversion-rate.entity';

@Injectable()
export class ConversionRatesService {
  constructor(
    @InjectRepository(PointsConversionRate)
    private readonly ratesRepository: Repository<PointsConversionRate>,
  ) {}

  // Taxa vigente na unidade = linha ativa e dentro do prazo mais recente
  // entre as da unidade e as que valem para todas. Quando um boost expira,
  // a vigente volta sozinha para a ativa anterior. Sem unidade, só as que
  // valem para todas.
  async getCurrent(
    unit: StoreUnit | null = null,
  ): Promise<PointsConversionRate> {
    const query = this.inEffect();
    if (unit) {
      query.andWhere('(r.unit IS NULL OR r.unit = :unit)', { unit });
    } else {
      query.andWhere('r.unit IS NULL');
    }
    const rate = await query.getOne();
    if (!rate) {
      throw new NotFoundException('Nenhuma taxa de conversão ativa');
    }
    return rate;
  }

  // Todas as taxas em vigor, mais recentes primeiro: a padrão (sem prazo) e
  // os boosts ainda não expirados de cada unidade.
  listInEffect(): Promise<PointsConversionRate[]> {
    return this.inEffect().getMany();
  }

  async create(
    {
      pointsPerReal,
      durationHours,
      unit,
      observation,
    }: CreateConversionRateDto,
    userId: string,
  ): Promise<PointsConversionRate> {
    if (!durationHours && unit) {
      throw new BadRequestException(
        'A taxa padrão vale para todas as unidades; só promoções têm unidade',
      );
    }

    // Prazo calculado com o now() do banco — mesma fonte de tempo usada
    // para comparar a expiração em getCurrent.
    const insert = this.ratesRepository
      .createQueryBuilder()
      .insert()
      .values({
        userId,
        pointsPerReal,
        unit: durationHours ? unit : null,
        observation: observation ?? null,
        expiresAt: durationHours
          ? () => 'now() + make_interval(hours => :durationHours)'
          : null,
      });
    if (durationHours) insert.setParameter('durationHours', durationHours);
    const result = await insert.execute();

    return this.ratesRepository.findOneByOrFail({
      id: (result.identifiers[0] as { id: string }).id,
    });
  }

  async setActive(id: string, active: boolean): Promise<PointsConversionRate> {
    const rate = await this.ratesRepository.findOneBy({ id });
    if (!rate) {
      throw new NotFoundException('Taxa de conversão não encontrada');
    }

    // Boosts expiram; sem nenhuma taxa ativa sem prazo, nenhum crédito de
    // pontos seria possível depois disso.
    if (rate.active && !active && rate.expiresAt === null) {
      const permanentCount = await this.ratesRepository
        .createQueryBuilder('r')
        .where('r.active = true')
        .andWhere('r.expires_at IS NULL')
        .getCount();
      if (permanentCount <= 1) {
        throw new BadRequestException(
          'Não é possível desativar a única taxa de conversão padrão',
        );
      }
    }

    rate.active = active;
    return this.ratesRepository.save(rate);
  }

  private inEffect(): SelectQueryBuilder<PointsConversionRate> {
    return this.ratesRepository
      .createQueryBuilder('r')
      .where('r.active = true')
      .andWhere('(r.expires_at IS NULL OR r.expires_at > now())')
      .orderBy('r.createdAt', 'DESC');
  }
}
