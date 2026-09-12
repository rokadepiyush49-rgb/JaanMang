import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve, sep } from 'node:path';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { ProblemCode, ProblemException } from '../common/errors/problem';

/**
 * What a client may upload, and what it becomes.
 *
 * Images and PDFs only. The content type is checked against the extension and
 * against the declared size before a key is issued, and checked *again* on the
 * way in for the local driver — a client's declared type is a claim, not a
 * fact, and the one thing this service must never do is hand back a URL that
 * serves attacker-chosen HTML from the platform's own origin.
 */
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

export interface PresignedUpload {
  /** Opaque key the client hands back when it attaches the file to something. */
  key: string;
  /** Where to PUT the bytes. */
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
  /** Which driver issued it, so the client can say so in a support ticket. */
  driver: 'r2' | 'local';
}

/**
 * Object storage, with two drivers behind one interface.
 *
 * Cloudflare R2 in production; local disk when the R2 variables are absent. The
 * local driver is not a stub — it is what makes the whole evidence chain
 * (photograph, verify, rate) provable on a fresh clone with no account
 * anywhere, which is the same reasoning as the report-intake keyword pass.
 *
 * Production is the exception: `assertUsable` refuses to serve uploads on the
 * local driver when NODE_ENV is production, because there blank R2 config is a
 * misconfiguration and silently writing evidence photographs to a container's
 * ephemeral disk would lose them on the next deploy.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger('Storage');

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    const { driver, requested } = this.config.storage;
    if (driver === 'local') {
      await mkdir(this.localRoot(), { recursive: true });
      this.logger.log(
        requested === 'auto'
          ? `R2 is not configured — uploads go to ${this.localRoot()}`
          : `local storage driver selected — uploads go to ${this.localRoot()}`,
      );
    }
  }

  get driver(): 'r2' | 'local' {
    return this.config.storage.driver;
  }

  /**
   * Refuse clearly rather than failing deep inside a request.
   *
   * The 503 is specifically for the production-on-local case. In development
   * the local driver is a supported configuration and this returns.
   */
  assertUsable(): void {
    if (this.driver === 'local' && this.config.isProduction) {
      throw new ProblemException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ProblemCode.MISSING_CONFIG,
        'File uploads are not configured on this deployment. Set R2_ACCOUNT_ID, ' +
          'R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.',
      );
    }
  }

  /**
   * Issue an upload target.
   *
   * Size and content type are enforced here, before any bytes move, because
   * a presigned URL is a capability: whatever it permits is what an attacker
   * gets if they obtain one.
   */
  presign(args: { contentType: string; sizeBytes: number; purpose: string }): PresignedUpload {
    this.assertUsable();

    const extension = ALLOWED[args.contentType];
    if (!extension) {
      throw ProblemException.badRequest(
        `Files of type ${args.contentType} are not accepted. Allowed: ${Object.keys(ALLOWED).join(', ')}.`,
      );
    }
    const max = this.config.storage.maxBytes;
    if (args.sizeBytes <= 0 || args.sizeBytes > max) {
      throw ProblemException.badRequest(
        `Files must be between 1 byte and ${Math.round(max / 1024 / 1024)} MB.`,
      );
    }

    // Date-partitioned and random. Never the client's filename: that is
    // attacker-controlled and has been a path-traversal vector for thirty years.
    const now = new Date();
    const key = [
      args.purpose.replace(/[^a-z0-9-]/gi, '') || 'file',
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
      `${randomUUID()}.${extension}`,
    ].join('/');

    const expiresAt = new Date(Date.now() + 15 * 60_000);

    return this.driver === 'r2'
      ? {
          key,
          url: this.signR2Put(key, args.contentType, expiresAt),
          method: 'PUT',
          headers: { 'content-type': args.contentType },
          expiresAt: expiresAt.toISOString(),
          driver: 'r2',
        }
      : {
          key,
          url: `/api/v1/uploads/local/${encodeURIComponent(key)}`,
          method: 'PUT',
          headers: { 'content-type': args.contentType },
          expiresAt: expiresAt.toISOString(),
          driver: 'local',
        };
  }

  /** Where a stored object is readable from. */
  publicUrl(key: string): string {
    if (this.driver === 'r2') {
      const base = this.config.r2.publicBaseUrl;
      return base
        ? `${base.replace(/\/$/, '')}/${key}`
        : `/api/v1/uploads/${encodeURIComponent(key)}`;
    }
    return `/api/v1/uploads/${encodeURIComponent(key)}`;
  }

  /* ------------------------------------------------------- local driver */

  async putLocal(key: string, body: Buffer, contentType: string): Promise<void> {
    this.assertUsable();
    if (!ALLOWED[contentType]) {
      throw ProblemException.badRequest(`Files of type ${contentType} are not accepted.`);
    }
    if (body.byteLength > this.config.storage.maxBytes) {
      throw ProblemException.badRequest('That file is larger than the upload limit.');
    }
    // The declared type is a claim. Check the bytes.
    if (!looksLike(contentType, body)) {
      throw ProblemException.badRequest(
        `That file is not a valid ${contentType}. The content does not match the declared type.`,
      );
    }

    const path = this.safePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async readLocal(key: string): Promise<{ body: Buffer; contentType: string }> {
    const path = this.safePath(key);
    try {
      await stat(path);
    } catch {
      throw ProblemException.notFound('No such file.');
    }
    const extension = key.split('.').pop() ?? '';
    const contentType =
      Object.entries(ALLOWED).find(([, ext]) => ext === extension)?.[0] ??
      'application/octet-stream';
    return { body: await readFile(path), contentType };
  }

  /**
   * Resolve a key to a path inside the upload root, or refuse.
   *
   * The check is on the *resolved* path, not on the key: `a/../../etc/passwd`
   * contains no suspicious characters until you resolve it.
   */
  private safePath(key: string): string {
    const root = this.localRoot();
    const path = resolve(root, normalize(key));
    if (path !== root && !path.startsWith(root + sep)) {
      throw ProblemException.badRequest('Invalid file key.');
    }
    return path;
  }

  private localRoot(): string {
    return resolve(process.cwd(), this.config.storage.localDir);
  }

  /* ---------------------------------------------------------- R2 driver */

  /**
   * An AWS SigV4 presigned PUT.
   *
   * Hand-rolled rather than pulling in the S3 SDK: this is the only S3
   * operation the product performs, and the SDK is several megabytes to sign
   * one URL. R2 is S3-compatible and the signature is the documented algorithm.
   */
  private signR2Put(key: string, contentType: string, expiresAt: Date): string {
    const { accountId, accessKeyId, secretAccessKey, bucket } = this.config.r2;
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const expiresIn = Math.max(1, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const query = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'content-type;host',
    });

    const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      query.toString(),
      `content-type:${contentType}\nhost:${host}\n`,
      'content-type;host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key: Buffer | string, data: string) =>
      createHmac('sha256', key).update(data).digest();
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${secretAccessKey ?? ''}`, dateStamp), region), service),
      'aws4_request',
    );
    query.set(
      'X-Amz-Signature',
      createHmac('sha256', signingKey).update(stringToSign).digest('hex'),
    );

    return `https://${host}${canonicalUri}?${query.toString()}`;
  }
}

/**
 * Magic-number check.
 *
 * Not a full parser — enough to establish that a file claiming to be a PNG
 * begins like one, which stops the "upload HTML as image/png and serve it from
 * our origin" attack that every file upload endpoint eventually meets.
 */
export function looksLike(contentType: string, body: Buffer): boolean {
  if (body.byteLength < 12) return false;
  const hex = body.subarray(0, 12).toString('hex');
  switch (contentType) {
    case 'image/jpeg':
      return hex.startsWith('ffd8ff');
    case 'image/png':
      return hex.startsWith('89504e470d0a1a0a');
    case 'image/webp':
      return hex.startsWith('52494646') && body.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'image/heic':
      return body.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'application/pdf':
      return hex.startsWith('255044462d');
    default:
      return false;
  }
}

export { ALLOWED as ALLOWED_UPLOAD_TYPES };
