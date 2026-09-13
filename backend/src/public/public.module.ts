import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicImpactService } from './public-impact.service';
import { StorageService } from '../storage/storage.service';

/**
 * The only surface where the platform's claims are checkable by a stranger.
 *
 * `StorageService` is here because the before-and-after images are the whole
 * argument of the impact portal: a figure a visitor cannot see the evidence for
 * is a figure they have to take on trust, which is what this page exists to
 * stop being necessary.
 */
@Module({
  controllers: [PublicController],
  providers: [PublicImpactService, StorageService],
})
export class PublicModule {}
