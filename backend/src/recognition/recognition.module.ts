import { Module } from '@nestjs/common';
import { RecognitionController } from './recognition.controller';
import { RecognitionService } from './recognition.service';

/**
 * Leaderboards, badges and the derived counters they read.
 *
 * Exported because the public portal serves the same rows — one computation,
 * two readers, rather than a public ranking that can disagree with the one a
 * student sees of themselves.
 */
@Module({
  controllers: [RecognitionController],
  providers: [RecognitionService],
  exports: [RecognitionService],
})
export class RecognitionModule {}
