import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { R2StorageService } from '../storage/r2-storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './entities/product.entity';
import { calculatePartial, calculatePoints } from './product-pricing';

// Formatos aceitos, reconhecidos pelos primeiros bytes do arquivo — o
// mimetype enviado pelo navegador não é confiável.
const IMAGE_TYPES = [
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (b: Buffer) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    matches: (b: Buffer) =>
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
];

// O que o cliente vê de um produto na loja: sem status e datas internas.
export type CatalogProduct = Pick<
  Product,
  | 'id'
  | 'name'
  | 'category'
  | 'description'
  | 'imageUrl'
  | 'points'
  | 'allowsPartialPoints'
  | 'partialPoints'
  | 'partialPrice'
  | 'allowedTiers'
>;

// O que o admin informa; o resto do preço é calculado por buildPricing.
type PricingInput = Pick<
  Product,
  'finalPrice' | 'conversionRate' | 'allowsPartialPoints' | 'cost'
>;

type Pricing = PricingInput &
  Pick<Product, 'points' | 'partialPoints' | 'partialPrice'>;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly storage: R2StorageService,
  ) {}

  /** Envia a imagem para o R2 e devolve a URL a gravar no produto. */
  async uploadImage(file: Express.Multer.File | undefined): Promise<string> {
    if (!file) {
      throw new BadRequestException('Envie a imagem no campo "file".');
    }
    const type = IMAGE_TYPES.find((t) => t.matches(file.buffer));
    if (!type) {
      throw new BadRequestException('A imagem deve ser JPG, PNG ou WebP.');
    }
    return this.storage.upload(
      `products/${randomUUID()}.${type.extension}`,
      file.buffer,
      type.contentType,
    );
  }

  /** Produtos (de uma categoria, se informada), mais recentes primeiro. */
  list(category?: string): Promise<Product[]> {
    return this.productsRepository.find({
      where: category ? { category } : {},
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  /**
   * Loja do cliente: só os produtos ativos, agrupáveis por categoria e do
   * mais barato para o mais caro dentro dela. Inclui os restritos a outros
   * níveis — o app mostra para quem são.
   */
  listCatalog(): Promise<CatalogProduct[]> {
    return this.productsRepository.find({
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true,
        points: true,
        allowsPartialPoints: true,
        partialPoints: true,
        partialPrice: true,
        allowedTiers: true,
      },
      where: { status: ProductStatus.ACTIVE },
      order: { category: 'ASC', points: 'ASC', name: 'ASC' },
    });
  }

  /** Categorias já usadas, em ordem alfabética — opções do filtro. */
  async listCategories(): Promise<string[]> {
    const rows = await this.productsRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .orderBy('p.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((row) => row.category);
  }

  async get(id: string): Promise<Product> {
    const product = await this.productsRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  create(dto: CreateProductDto): Promise<Product> {
    this.assertOwnImage(dto.imageUrl);
    const product = this.productsRepository.create({
      name: dto.name,
      category: dto.category,
      description: dto.description,
      imageUrl: dto.imageUrl,
      status: dto.status ?? ProductStatus.ACTIVE,
      allowedTiers: dto.allowedTiers,
      ...buildPricing({
        finalPrice: dto.finalPrice,
        conversionRate: dto.conversionRate,
        allowsPartialPoints: dto.allowsPartialPoints ?? false,
        cost: dto.cost ?? null,
      }),
    });
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.get(id);
    const previousImageUrl = product.imageUrl;
    if (dto.imageUrl !== undefined && dto.imageUrl !== previousImageUrl) {
      this.assertOwnImage(dto.imageUrl);
    }

    // Os pontos são recalculados com o produto já atualizado: o PATCH pode
    // mudar só a taxa, por exemplo, e a troca parcial acompanha.
    Object.assign(product, {
      name: dto.name ?? product.name,
      category: dto.category ?? product.category,
      description: dto.description ?? product.description,
      imageUrl: dto.imageUrl ?? product.imageUrl,
      status: dto.status ?? product.status,
      allowedTiers: dto.allowedTiers ?? product.allowedTiers,
      ...buildPricing({
        finalPrice: dto.finalPrice ?? product.finalPrice,
        conversionRate: dto.conversionRate ?? product.conversionRate,
        allowsPartialPoints:
          dto.allowsPartialPoints ?? product.allowsPartialPoints,
        cost: dto.cost !== undefined ? dto.cost : product.cost,
      }),
    });
    const saved = await this.productsRepository.save(product);

    // A imagem antiga só sai do bucket depois que o produto já aponta para
    // a nova.
    if (saved.imageUrl !== previousImageUrl) {
      await this.storage.deleteByUrl(previousImageUrl);
    }
    return saved;
  }

  // Só aceita imagens enviadas pelo POST /admin/products/image, para o
  // banco não guardar links externos que podem sumir.
  private assertOwnImage(url: string): void {
    if (!this.storage.isOwnUrl(url)) {
      throw new BadRequestException(
        'Envie a imagem pelo upload do produto antes de salvar.',
      );
    }
  }
}

// Calcula pontos e troca parcial a partir do que o admin informou. Sem
// troca parcial, custo e valores parciais ficam NULL; com ela, o custo é
// obrigatório. Mesmas regras dos CHKs da tabela, com mensagens para o
// formulário.
function buildPricing(input: PricingInput): Pricing {
  const points = calculatePoints(input.finalPrice, input.conversionRate);
  if (points < 1) {
    throw new BadRequestException(
      'O preço final é baixo demais para gerar pontos com essa taxa.',
    );
  }
  if (!input.allowsPartialPoints) {
    return {
      ...input,
      cost: null,
      points,
      partialPoints: null,
      partialPrice: null,
    };
  }
  if (input.cost === null) {
    throw new BadRequestException(
      'Informe o preço de custo para a troca parcial.',
    );
  }
  const partial = calculatePartial(input.cost, points);
  if (partial.partialPoints < 1 || partial.partialPoints >= points) {
    throw new BadRequestException(
      'O preço final é baixo demais para permitir troca parcial.',
    );
  }
  return { ...input, points, ...partial };
}
