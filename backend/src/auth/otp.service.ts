import { createHash, randomInt } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { ProblemException } from '../common/errors/problem';
import { durationToSeconds } from './token.service';

const MAX_ATTEMPTS = 5;

/**
 * Phone one-time codes for citizen sign-in and phone verification.
 *
 * Codes are 6 digits, hashed at rest, single-use, short-lived and rate-limited
 * by attempts. There is no SMS provider wired up yet: with `OTP_DEV_ECHO=true`
 * the code is logged and returned in the response so the flow is testable, and
 * the Flutter OTP screens can point straight at it.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger('Otp');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Issues a code, returning it only when dev-echo is on. */
  async issue(phone: string, purpose: OtpPurpose): Promise<{ devCode?: string }> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttlSeconds = durationToSeconds(this.config.otp.ttl);

    // Invalidate any live code for this phone+purpose so only the newest works.
    await this.prisma.otpCode.updateMany({
      where: { phone, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.otpCode.create({
      data: {
        phone,
        purpose,
        codeHash: hash(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });

    if (this.config.otp.devEcho) {
      this.logger.warn(`OTP for ${redact(phone)} (${purpose}): ${code}`);
      return { devCode: code };
    }
    // TODO(stage 9): send via the SMS channel adapter.
    return {};
  }

  /**
   * Consumes a code. Throws `ProblemException` on any failure with a single
   * generic message — no distinction between "wrong code" and "no code", so an
   * attacker learns nothing.
   */
  async consume(phone: string, purpose: OtpPurpose, code: string): Promise<void> {
    const row = await this.prisma.otpCode.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const fail = () => ProblemException.badRequest('That code is not valid or has expired.');

    if (!row || row.expiresAt < new Date()) throw fail();
    if (row.attempts >= MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });
      throw ProblemException.rateLimited('Too many attempts. Request a new code.');
    }

    if (row.codeHash !== hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: row.id },
        data: { attempts: { increment: 1 } },
      });
      throw fail();
    }

    await this.prisma.otpCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
  }
}

function hash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function redact(phone: string): string {
  return phone.length > 4 ? `••••${phone.slice(-4)}` : '••••';
}
