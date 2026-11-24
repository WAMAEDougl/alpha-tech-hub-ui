import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WorkflowService } from './workflow.service';
import { PricingService } from './pricing.service';
import { OrdersController } from './orders.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [OrdersService, WorkflowService, PricingService],
  controllers: [OrdersController],
  exports: [OrdersService, PricingService, WorkflowService],
})
export class OrdersModule {}
