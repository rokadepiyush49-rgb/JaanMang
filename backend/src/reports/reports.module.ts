import { Module } from '@nestjs/common';
import { ProblemVotesController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { IntakeAiService } from './intake-ai.service';
import { ClusteringService } from './clustering.service';

/**
 * Citizen intake, voting and clustering — the head of the loop.
 *
 * `ClusteringService` is exported because stage 03's delivery module needs to
 * recompute a problem's factors when an officer changes its severity, and
 * stage 06's verification does the same when work completes. The derivation
 * lives in one place or it will disagree with itself.
 */
@Module({
  controllers: [ReportsController, ProblemVotesController],
  providers: [ReportsService, IntakeAiService, ClusteringService],
  exports: [ClusteringService, IntakeAiService],
})
export class ReportsModule {}
