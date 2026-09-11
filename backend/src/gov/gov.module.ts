import { Module } from '@nestjs/common';
import { GovReferenceController } from './gov-reference.controller';
import { ProblemsController } from '../problems/problems.controller';
import { ProblemsService } from '../problems/problems.service';
import { ProblemsRepository } from '../problems/problems.repository';

/**
 * The government workspace API: the problem lifecycle plus the reference data
 * the `/gov` screens read alongside it.
 */
@Module({
  controllers: [GovReferenceController, ProblemsController],
  providers: [ProblemsService, ProblemsRepository],
})
export class GovModule {}
