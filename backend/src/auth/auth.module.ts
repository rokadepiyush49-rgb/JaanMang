import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountStatusGuard } from './guards/account-status.guard';

/**
 * Authentication. Exported so later modules (rbac, problems) can inject
 * `AuthService.principalFor`. The global `JwtAuthGuard` makes every route
 * deny-by-default — `@Public()` opts out.
 */
@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, RegistrationController],
  providers: [
    AuthService,
    RegistrationService,
    OtpService,
    TokenService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Order matters: this runs after JwtAuthGuard, so `request.user` is set.
    { provide: APP_GUARD, useClass: AccountStatusGuard },
  ],
  exports: [AuthService, RegistrationService, TokenService],
})
export class AuthModule {}
