import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { AdminProductsController } from './admin-products.controller';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), StorageModule],
  controllers: [AdminProductsController, ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
