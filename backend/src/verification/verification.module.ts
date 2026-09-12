import { Module } from '@nestjs/common';
import {
  GovVerificationController,
  UploadsController,
  VerificationController,
} from './verification.controller';
import { VerificationService } from './verification.service';
import { StorageService } from '../storage/storage.service';

/**
 * Evidence, citizen verification, delivery rating and the ranking appeal.
 *
 * `StorageService` lives here rather than in its own module because uploads
 * exist in this product to carry evidence; nothing else uploads anything yet.
 */
@Module({
  controllers: [UploadsController, VerificationController, GovVerificationController],
  providers: [VerificationService, StorageService],
  exports: [StorageService, VerificationService],
})
export class VerificationModule {}
