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
      // .env is read locally (NODE_ENV unset or "development"). Production and
      // staging get real variables from the platform (Railway); tests are
      // hermetic and set process.env directly (see test/e2e/setup.ts).
      ignoreEnvFile: ['production', 'staging', 'test'].includes(process.env.NODE_ENV ?? ''),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
