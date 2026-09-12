import { Module } from '@nestjs/common';
import { IndustryController } from './industry.controller';
import { IndustryService } from './industry.service';
import { IndustryEngagementService } from './industry-engagement.service';

/**
 * The industry partner portal.
 *
 * `IndustryService` is exported because the government's sponsorship module
 * needs `refreshMatches` — the match engine writes `SponsorshipMatch`, which is
 * a government row, and having two scorers would mean the officer's list and
 * the partner's list could disagree about the same pairing.
 */
@Module({
  controllers: [IndustryController],
  providers: [IndustryService, IndustryEngagementService],
  exports: [IndustryService],
})
export class IndustryModule {}
