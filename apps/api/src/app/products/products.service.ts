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

type Pricing = Pick<
  Product,
  'points' | 'allowsPartialPoints' | 'partialPoints' | 'partialPrice'
>;

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
      ...normalizePricing({
        points: dto.points,
        allowsPartialPoints: dto.allowsPartialPoints ?? false,
        partialPoints: dto.partialPoints ?? null,
        partialPrice: dto.partialPrice ?? null,
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

    // A troca parcial é validada com o produto já atualizado: o PATCH pode
    // mudar só os pontos e deixar o parcial acima do total, por exemplo.
    Object.assign(product, {
      name: dto.name ?? product.name,
      category: dto.category ?? product.category,
      description: dto.description ?? product.description,
      imageUrl: dto.imageUrl ?? product.imageUrl,
      status: dto.status ?? product.status,
      allowedTiers: dto.allowedTiers ?? product.allowedTiers,
      ...normalizePricing({
        points: dto.points ?? product.points,
        allowsPartialPoints:
          dto.allowsPartialPoints ?? product.allowsPartialPoints,
        partialPoints:
          dto.partialPoints !== undefined
            ? dto.partialPoints
            : product.partialPoints,
        partialPrice:
          dto.partialPrice !== undefined
            ? dto.partialPrice
            : product.partialPrice,
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

// Sem troca parcial, pontos e preço parciais são descartados; com ela, os
// dois são obrigatórios e o parcial precisa ser menor que o total. Mesmas
// regras do CHK_products_partial, com mensagens para o formulário.
function normalizePricing(pricing: Pricing): Pricing {
  if (!pricing.allowsPartialPoints) {
    return { ...pricing, partialPoints: null, partialPrice: null };
  }
  if (pricing.partialPoints === null || pricing.partialPrice === null) {
    throw new BadRequestException(
      'Informe os pontos e o preço da troca parcial.',
    );
  }
  if (pricing.partialPoints >= pricing.points) {
    throw new BadRequestException(
      'Os pontos da troca parcial devem ser menores que os pontos do produto.',
    );
  }
  return pricing;
}
