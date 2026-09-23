import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateConversionRateDto } from './dto/create-conversion-rate.dto';
import { PointsConversionRate } from './entities/points-conversion-rate.entity';

@Injectable()
export class ConversionRatesService {
  constructor(
    @InjectRepository(PointsConversionRate)
    private readonly ratesRepository: Repository<PointsConversionRate>,
  ) {}

  // Taxa vigente = linha ativa mais recente.
  async getCurrent(): Promise<PointsConversionRate> {
    const rate = await this.ratesRepository.findOne({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    if (!rate) {
      throw new NotFoundException('Nenhuma taxa de conversão ativa');
    }
    return rate;
  }

  create(
    { pointsPerReal, observation }: CreateConversionRateDto,
    userId: string,
  ): Promise<PointsConversionRate> {
    return this.ratesRepository.save(
      this.ratesRepository.create({
        userId,
        pointsPerReal,
        observation: observation ?? null,
      }),
    );
  }

  async setActive(id: string, active: boolean): Promise<PointsConversionRate> {
    const rate = await this.ratesRepository.findOneBy({ id });
    if (!rate) {
      throw new NotFoundException('Taxa de conversão não encontrada');
    }

    // Sem nenhuma taxa ativa, nenhum crédito de pontos seria possível.
    if (rate.active && !active) {
      const activeCount = await this.ratesRepository.countBy({ active: true });
      if (activeCount <= 1) {
        throw new BadRequestException(
          'Não é possível desativar a única taxa de conversão ativa',
        );
      }
    }

    rate.active = active;
    return this.ratesRepository.save(rate);
  }
}
