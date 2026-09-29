import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductStatus, ProductTier } from '../entities/product.entity';
import {
  MAX_CONVERSION_RATE,
  MAX_FINAL_PRICE,
  MIN_CONVERSION_RATE,
} from '../product-pricing';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Pontos e troca parcial não vêm do formulário: o ProductsService calcula a
// partir de preço final, taxa e custo, e valida o produto inteiro (inclusive
// no PATCH).
export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  category!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;

  // URL devolvida por POST /admin/products/image.
  @IsUrl({ protocols: ['https', 'http'], require_tld: false })
  @MaxLength(1024)
  imageUrl!: string;

  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(MAX_FINAL_PRICE)
  finalPrice!: number;

  // Fração (0.05 = 5%): pontos = (preço final / taxa) * 100.
  @IsNumber({ maxDecimalPlaces: 4, allowNaN: false, allowInfinity: false })
  @Min(MIN_CONVERSION_RATE)
  @Max(MAX_CONVERSION_RATE)
  conversionRate!: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  allowsPartialPoints?: boolean;

  // Obrigatório só com troca parcial; sem ela é ignorado.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(99_999_999.99)
  cost?: number | null;

  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um nível.' })
  @ArrayUnique()
  @IsEnum(ProductTier, { each: true })
  allowedTiers!: ProductTier[];
}
