import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

// Níveis que podem trocar pelo produto. Diferente do GrantedTier, inclui o
// standard: aqui ele é uma escolha válida, não o nível implícito.
export enum ProductTier {
  STANDARD = 'standard',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  BLACK = 'black',
}

// O driver pg devolve numeric como string, por isso o transformer.
const numeric = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

// Produtos da troca de pontos. A troca pode ser só com pontos (`points`)
// ou, se `allows_partial_points`, com `partial_points` + `partial_price`.
// Os três são calculados pela API a partir de preço final, taxa e custo
// (ver product-pricing.ts).
@Entity('products')
@Index('IDX_products_status_created_at', ['status', 'createdAt'])
@Index('IDX_products_category', ['category'])
@Check('CHK_products_points_positive', '"points" > 0')
@Check(
  'CHK_products_partial',
  `("allows_partial_points" = false AND "partial_points" IS NULL AND "partial_price" IS NULL)
    OR ("allows_partial_points" = true AND "partial_points" > 0
      AND "partial_points" < "points" AND "partial_price" > 0)`,
)
@Check('CHK_products_final_price_positive', '"final_price" > 0')
@Check(
  'CHK_products_conversion_rate_range',
  '"conversion_rate" BETWEEN 0.02 AND 0.08',
)
@Check(
  'CHK_products_cost',
  `("allows_partial_points" = false AND "cost" IS NULL)
    OR ("allows_partial_points" = true AND "cost" > 0)`,
)
@Check(
  'CHK_products_allowed_tiers_not_empty',
  'cardinality("allowed_tiers") > 0',
)
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  // Texto livre (ex.: "Cafés", "Acessórios"); o formulário sugere as
  // categorias já usadas para evitar variações do mesmo nome.
  @Column({ length: 60 })
  category!: string;

  @Column({ type: 'text' })
  description!: string;

  // URL pública da imagem no Cloudflare R2 — o arquivo não fica no banco.
  @Column({ name: 'image_url', type: 'varchar', length: 1024 })
  imageUrl!: string;

  // Preço de venda (R$), base do cálculo dos pontos.
  @Column({
    name: 'final_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numeric,
  })
  finalPrice!: number;

  // Taxa de conversão como fração, de 0.02 a 0.08 (0.05 = 5%).
  @Column({
    name: 'conversion_rate',
    type: 'numeric',
    precision: 5,
    scale: 4,
    transformer: numeric,
  })
  conversionRate!: number;

  // Pontos para trocar só com pontos: (finalPrice / conversionRate) * 100.
  @Column({ type: 'integer' })
  points!: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    enumName: 'products_status_enum',
    default: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @Column({ name: 'allows_partial_points', type: 'boolean', default: false })
  allowsPartialPoints!: boolean;

  // Custo do produto (R$), base do preço da troca parcial. NULL sem ela.
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  cost!: number | null;

  // Pontos + preço da troca parcial; os dois NULL quando ela não é permitida.
  @Column({ name: 'partial_points', type: 'integer', nullable: true })
  partialPoints!: number | null;

  @Column({
    name: 'partial_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numeric,
  })
  partialPrice!: number | null;

  @Column({
    name: 'allowed_tiers',
    type: 'enum',
    enum: ProductTier,
    enumName: 'products_tier_enum',
    array: true,
  })
  allowedTiers!: ProductTier[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
