import { Module } from '@nestjs/common';
import { InstituteController } from './institute.controller';
import { InstituteService } from './institute.service';

/**
 * The institute workspace API.
 *
 * Sits beside `GovModule` and serves `/institute/*` in the web app: the
 * academic structure, the student roster, faculty, teams and the project
 * pipeline through to submission.
 */
@Module({
  controllers: [InstituteController],
  providers: [InstituteService],
})
export class InstituteModule {}
