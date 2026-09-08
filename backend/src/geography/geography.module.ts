import { Module } from '@nestjs/common';
import { GeographyController } from './geography.controller';

@Module({ controllers: [GeographyController] })
export class GeographyModule {}
