import { Module } from '@nestjs/common';
import { RegistryController } from './registry.controller';

@Module({ controllers: [RegistryController] })
export class RegistryModule {}
