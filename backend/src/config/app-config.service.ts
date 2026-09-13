import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed access to configuration.
 *
 * Wraps `@nestjs/config`'s stringly-typed `ConfigService` so the rest of the
 * app reads `config.jwt.accessSecret` rather than `configService.get('JWT_...')`
 * with a cast. The values are already validated and coerced by `loadEnv`.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get isDev(): boolean {
    return this.nodeEnv === 'development';
  }
  get port(): number {
    return this.get('PORT');
  }
  get logLevel(): string {
    return this.get('LOG_LEVEL');
  }
  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS');
  }
  get publicApiUrl(): string {
    return this.get('PUBLIC_API_URL');
  }

  get database() {
    return {
      url: this.get('DATABASE_URL'),
      directUrl: this.get('DIRECT_URL'),
    };
  }

  get jwt() {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      accessTtl: this.get('JWT_ACCESS_TTL'),
      refreshTtl: this.get('JWT_REFRESH_TTL'),
    };
  }

  get otp() {
    return {
      ttl: this.get('OTP_TTL'),
      devEcho: this.get('OTP_DEV_ECHO'),
    };
  }

  get r2() {
    const accountId = this.get('R2_ACCOUNT_ID');
    const accessKeyId = this.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.get('R2_SECRET_ACCESS_KEY');
    const bucket = this.get('R2_BUCKET');
    return {
      configured: Boolean(accountId && accessKeyId && secretAccessKey && bucket),
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      publicBaseUrl: this.get('R2_PUBLIC_BASE_URL') || undefined,
    };
  }

  /** Thresholds for `ClusteringService`. See the env schema for why. */
  get clustering() {
    return {
      confidenceMin: this.get('CLUSTER_CONFIDENCE_MIN'),
      radiusM: this.get('CLUSTER_RADIUS_M'),
      similarityMin: this.get('CLUSTER_SIMILARITY_MIN'),
      cronEnabled: this.get('CLUSTER_CRON_ENABLED'),
    };
  }

  /** The external recommender, when one is configured. See the env schema. */
  get recommender() {
    const url = this.get('RECOMMENDER_URL');
    return {
      url: url || undefined,
      configured: Boolean(url),
      timeoutMs: this.get('RECOMMENDER_TIMEOUT_MS'),
    };
  }

  /** Upload limits and which driver serves them. See the env schema. */
  get storage() {
    const driver = this.get('STORAGE_DRIVER');
    const r2 = this.r2;
    return {
      /** The driver actually in force, once `auto` is resolved. */
      driver: driver === 'auto' ? (r2.configured ? 'r2' : 'local') : driver,
      requested: driver,
      localDir: this.get('STORAGE_LOCAL_DIR'),
      maxBytes: this.get('UPLOAD_MAX_BYTES'),
    } as const;
  }

  get groqApiKey(): string | undefined {
    return this.get('GROQ_API_KEY');
  }
  get geminiApiKey(): string | undefined {
    return this.get('GEMINI_API_KEY');
  }
  get fcmServiceAccountJson(): string | undefined {
    return this.get('FCM_SERVICE_ACCOUNT_JSON');
  }
}
