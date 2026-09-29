import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import type { CatalogProduct } from './products.service';

// Loja da troca de pontos, para qualquer usuário logado. Por enquanto só
// listagem — a troca em si ainda não existe.
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(): Promise<CatalogProduct[]> {
    return this.productsService.listCatalog();
  }
}
