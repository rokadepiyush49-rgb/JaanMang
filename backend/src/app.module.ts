import { Module } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppConfigService } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { PrincipalThrottlerGuard } from './common/throttler/principal-throttler.guard';
import { loggerConfig } from './common/logging/logger.config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { AuditModule } from './audit/audit.module';
import { GeographyModule } from './geography/geography.module';
import { GovModule } from './gov/gov.module';
import { InstituteModule } from './institute/institute.module';
import { RegistryModule } from './registry/registry.module';
import { PublicModule } from './public/public.module';

/**
 * Root module.
 *
 * Feature modules (auth, rbac, problems, geography, …) are added here as each
 * stage of the roadmap lands. Stage 0 wires only the platform: config, logging,
 * database, error handling, rate limiting and the health probes.
 */
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        loggerConfig({ level: config.logLevel, pretty: config.isDev }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // Rate limiting is a production concern; e2e tests hammer /auth and
        // would trip it. Keep it real everywhere except NODE_ENV=test.
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            // A single government screen issues thirteen reads on mount (the
            // problem list, the weights, and ten reference lists), so 120/min
            // was about nine navigations before an officer locked themselves
            // out of their own workspace. The sensitive endpoints do not rely
            // on this number — `/auth/login`, `/auth/otp/request` and the
            // password-reset routes carry their own far tighter `@Throttle`.
            limit: config.nodeEnv === 'test' ? 100_000 : 600,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    RbacModule,
    AuditModule,
    GeographyModule,
    GovModule,
    InstituteModule,
    RegistryModule,
    PublicModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // Keyed on the account rather than the address — see the guard for why
    // an IP bucket is the wrong shape behind the web app's route handler.
    { provide: APP_GUARD, useClass: PrincipalThrottlerGuard },
  ],
})
export class AppModule {}
