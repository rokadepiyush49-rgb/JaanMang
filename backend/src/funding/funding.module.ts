import { Module } from '@nestjs/common';
import { FundingController } from './funding.controller';
import { FundingService } from './funding.service';
import { ProblemsService } from '../problems/problems.service';
import { ProblemsRepository } from '../problems/problems.repository';

/** Government funding: the department budget, the allocation and the ledger. */
@Module({
  controllers: [FundingController],
  providers: [FundingService, ProblemsService, ProblemsRepository],
})
export class FundingModule {}
