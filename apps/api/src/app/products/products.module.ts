import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { AdminProductsController } from './admin-products.controller';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), StorageModule],
  controllers: [AdminProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
