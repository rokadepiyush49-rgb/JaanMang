import { Module } from '@nestjs/common';
import { SponsorshipController } from './sponsorship.controller';
import { SponsorshipService } from './sponsorship.service';
import { ProblemsService } from '../problems/problems.service';
import { ProblemsRepository } from '../problems/problems.repository';

/** Industry sponsorship: invite, approve, decline, fall back to government. */
@Module({
  controllers: [SponsorshipController],
  providers: [SponsorshipService, ProblemsService, ProblemsRepository],
})
export class SponsorshipModule {}
