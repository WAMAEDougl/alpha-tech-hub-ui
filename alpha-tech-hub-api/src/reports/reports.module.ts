import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';
import { RepairsModule } from '../repairs/repairs.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [SettingsModule, OrdersModule, RepairsModule, ProductsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
