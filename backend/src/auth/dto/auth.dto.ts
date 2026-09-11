import { z } from 'zod';
import { createZodDto } from '../../common/validation';

/** E.164-ish: a leading + and 8–15 digits. Kept liberal for Indian numbers. */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'enter a valid phone number');

const email = z.string().trim().toLowerCase().email();

/** Strength rule — applied when a password is *set* (reset), not when logging in. */
const newPassword = z.string().min(8, 'use at least 8 characters').max(200);
/** At login we only need something non-empty; the policy must not leak here. */
const loginPassword = z.string().min(1).max(200);

export class OtpRequestDto extends createZodDto(
  z.object({
    phone,
    purpose: z.enum(['login', 'phone_verify']).default('login'),
  }),
) {}

export class OtpVerifyDto extends createZodDto(
  z.object({
    phone,
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'the code is 6 digits'),
    /** Optional display name, used only when this verify creates the account. */
    displayName: z.string().trim().min(1).max(120).optional(),
  }),
) {}

export class LoginDto extends createZodDto(z.object({ email, password: loginPassword })) {}

export class RefreshDto extends createZodDto(z.object({ refreshToken: z.string().min(1) })) {}

export class LogoutDto extends createZodDto(
  z.object({ refreshToken: z.string().min(1).optional() }),
) {}

export class PasswordResetRequestDto extends createZodDto(z.object({ email })) {}

export class PasswordResetDto extends createZodDto(
  z.object({ token: z.string().min(1), password: newPassword }),
) {}
