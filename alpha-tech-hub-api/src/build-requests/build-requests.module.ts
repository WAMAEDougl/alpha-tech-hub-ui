import { Module } from '@nestjs/common';
import { BuildRequestsController } from './build-requests.controller';

@Module({ controllers: [BuildRequestsController] })
export class BuildRequestsModule {}
