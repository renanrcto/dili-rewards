import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateConversionRateDto } from './dto/create-conversion-rate.dto';
import { PointsConversionRate } from './entities/points-conversion-rate.entity';

@Injectable()
export class ConversionRatesService {
  constructor(
    @InjectRepository(PointsConversionRate)
    private readonly ratesRepository: Repository<PointsConversionRate>,
  ) {}

  // Taxa vigente = linha ativa e dentro do prazo mais recente. Quando um
  // boost expira, a vigente volta sozinha para a ativa anterior.
  async getCurrent(): Promise<PointsConversionRate> {
    const rate = await this.inEffect().getOne();
    if (!rate) {
      throw new NotFoundException('Nenhuma taxa de conversão ativa');
    }
    return rate;
  }

  // Todas as taxas em vigor, a vigente primeiro: a padrão (sem prazo) e os
  // boosts ainda não expirados.
  listInEffect(): Promise<PointsConversionRate[]> {
    return this.inEffect().getMany();
  }

  async create(
    { pointsPerReal, durationHours, observation }: CreateConversionRateDto,
    userId: string,
  ): Promise<PointsConversionRate> {
    // Prazo calculado com o now() do banco — mesma fonte de tempo usada
    // para comparar a expiração em getCurrent.
    const insert = this.ratesRepository
      .createQueryBuilder()
      .insert()
      .values({
        userId,
        pointsPerReal,
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
