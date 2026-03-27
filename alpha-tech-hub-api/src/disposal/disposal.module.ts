import { Module } from '@nestjs/common';
import { DisposalController } from './disposal.controller';

@Module({ controllers: [DisposalController] })
export class DisposalModule {}
