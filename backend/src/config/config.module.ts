import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { loadEnv } from './env.schema';

/**
 * Global configuration. `loadEnv` runs once here; every other module injects
 * `AppConfigService` for typed access. `isGlobal` means no re-import anywhere.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // A single validator for the whole environment — see env.schema.ts.
      validate: (raw) => loadEnv(raw as NodeJS.ProcessEnv),
      // .env is read in every environment except production, where the platform
      // (Railway) injects real variables.
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
