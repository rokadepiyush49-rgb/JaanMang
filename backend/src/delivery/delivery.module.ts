import { Module } from '@nestjs/common';
import { DeliveryController, WorkspaceController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ProblemsService } from '../problems/problems.service';
import { ProblemsRepository } from '../problems/problems.repository';

/** Assignment, progress, completion, and the workspace's automations and alerts. */
@Module({
  controllers: [DeliveryController, WorkspaceController],
  providers: [DeliveryService, ProblemsService, ProblemsRepository],
})
export class DeliveryModule {}
