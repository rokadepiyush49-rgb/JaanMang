import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../rbac/permissions.decorator';
import { Surfaces } from '../rbac/surface.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { StorageService } from '../storage/storage.service';
import { VerificationService } from './verification.service';
import {
  AdjustPriorityDto,
  EvidenceDto,
  ObjectionDto,
  PresignDto,
  RateDto,
  VerifyDto,
} from './verification.dto';

/**
 * `/api/v1/uploads/*` — presigned upload targets.
 *
 * Open to any signed-in account, whatever their surface: an officer uploads
 * completion photographs and a citizen uploads their verification evidence,
 * and both are attached to something by a separate call that checks standing.
 * Issuing a key grants nothing on its own.
 */
@ApiTags('uploads')
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('presign')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get an upload target',
    description:
      'Content type and size are enforced here, before any bytes move, because a presigned URL ' +
      'is a capability. Returns a 503 when the deployment has no storage configured, rather ' +
      'than a confusing 500 later.',
  })
  presign(@Body() dto: PresignDto) {
    return this.storage.presign(dto);
  }

  /**
   * The local driver's upload target.
   *
   * Only reachable when R2 is not configured. The magic-number check happens
   * here, on the actual bytes, because the content type a client declared is a
   * claim and this endpoint is the last place to test it.
   */
  @Put('local/:key')
  @HttpCode(201)
  async putLocal(
    @Param('key') key: string,
    @Headers('content-type') contentType: string,
    @Req() req: FastifyRequest,
  ) {
    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body)) {
      return { error: 'Send the file as a raw body with its content-type header.' };
    }
    await this.storage.putLocal(decodeURIComponent(key), body, contentType);
    return { key: decodeURIComponent(key), stored: true };
  }

  /**
   * Serve a stored file.
   *
   * `@Public()` because a before-and-after gallery is shown on the public
   * impact portal — the whole argument for evidence is that a stranger can
   * check it. The keys are unguessable UUIDs, and nothing private is ever
   * stored through this path.
   */
  @Get(':key')
  @Public()
  @ApiOperation({ summary: 'Serve an uploaded file' })
  async serve(@Param('key') key: string, @Res() reply: FastifyReply) {
    const { body, contentType } = await this.storage.readLocal(decodeURIComponent(key));
    void reply
      .header('content-type', contentType)
      // Belt and braces against the content type being wrong anyway.
      .header('x-content-type-options', 'nosniff')
      .header('content-disposition', 'inline')
      .header('cache-control', 'public, max-age=31536000, immutable')
      .send(body);
  }
}

/**
 * `/api/v1/verification/*` — the citizen's half of the loop.
 *
 * No `@Surfaces` decorator: these routes are for the people who filed the
 * reports, and a citizen holds the `citizen` surface while a student who
 * reported a problem holds `student`. Standing is checked per problem against
 * who actually reported it, which is a stronger test than a surface anyway.
 */
@ApiTags('verification')
@Controller({ path: 'verification', version: '1' })
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('mine')
  @ApiOperation({
    summary: 'Verification requests addressed to you',
    description:
      'Only problems you reported. Somebody who did not report the broken handpump has no ' +
      'standing to say it was fixed.',
  })
  mine(@CurrentUser() user: AuthPrincipal) {
    return this.verification.myRequests(user);
  }

  @Post('problems/:id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Say whether the work was actually done',
    description:
      'Answering again replaces your previous answer. The problem closes only when everybody ' +
      'asked has answered and confirmations outweigh denials three to one.',
  })
  verify(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: VerifyDto) {
    return this.verification.verify(user, id, dto);
  }

  @Post('projects/:id/rate')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rate how well it was delivered',
    description:
      'A different question from verification: that asks whether it was fixed, this asks how ' +
      'well. Merging them loses the answer the delivery leaderboards rank on.',
  })
  rate(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: RateDto) {
    return this.verification.rate(user, id, dto);
  }

  @Get('projects/:id/ratings')
  @Public()
  @ApiOperation({
    summary: 'The rating summary for a project',
    description:
      'Public, and without the raters. A citizen rating their own government’s work should not ' +
      'have their name on it in a public summary.',
  })
  ratings(@Param('id') id: string) {
    return this.verification.ratingsOf(id);
  }

  @Get('problems/:id/evidence')
  @Public()
  @ApiOperation({ summary: 'The before-and-after pair' })
  evidence(@Param('id') id: string) {
    return this.verification.evidenceOf(id);
  }

  @Post('problems/:id/object')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Object to a published ranking',
    description:
      'The appeal path DESIGN.md specifies. Recorded against the problem so an officer answers ' +
      'it in the open rather than in a phone call.',
  })
  object(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: ObjectionDto) {
    return this.verification.objectToRanking(user, id, dto.reason);
  }
}

/** `/api/v1/gov/verification/*` — the officer's half. */
@ApiTags('verification')
@Controller({ path: 'gov', version: '1' })
@Surfaces('gov')
export class GovVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post('problems/:id/evidence')
  @HttpCode(200)
  @Permissions('project.update')
  @ApiOperation({ summary: 'Attach before or after photographs to a problem' })
  addEvidence(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: EvidenceDto,
  ) {
    return this.verification.addEvidence(user, id, dto.side, dto.keys, dto.note);
  }

  @Get('problems/:id/objections')
  @ApiOperation({ summary: 'Objections raised against this problem’s ranking' })
  objections(@Param('id') id: string) {
    return this.verification.objections(id);
  }

  @Post('problems/:id/adjust-priority')
  @HttpCode(200)
  @Permissions('settings.manage')
  @ApiOperation({
    summary: 'Answer an objection with a named, bounded correction',
    description:
      'Bounded to ±15 points. Anything larger is a re-weighting, which belongs in the published ' +
      'weight set where everybody can see it.',
  })
  adjust(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: AdjustPriorityDto,
  ) {
    return this.verification.adjustPriority(user, id, dto);
  }

  @Get('verification/:id')
  @ApiOperation({ summary: 'Where verification on a problem has got to' })
  status(@Param('id') id: string) {
    return this.verification.statusOf(id);
  }
}
