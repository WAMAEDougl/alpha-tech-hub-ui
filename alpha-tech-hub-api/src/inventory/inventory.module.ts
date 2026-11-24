import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';

@Module({
  providers: [InventoryService, ProcurementService],
  controllers: [InventoryController, ProcurementController],
  exports: [InventoryService],
})
export class InventoryModule {}
