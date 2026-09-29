import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Mesmos campos do CreateProductDto, todos opcionais. Repetidos aqui porque
// o projeto não usa @nestjs/mapped-types (PartialType).
export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_tld: false })
  @MaxLength(1024)
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  points?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  allowsPartialPoints?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  partialPoints?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(99_999_999.99)
  partialPrice?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um nível.' })
  @ArrayUnique()
  @IsEnum(ProductTier, { each: true })
  allowedTiers?: ProductTier[];
}
