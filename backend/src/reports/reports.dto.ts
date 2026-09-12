import { z } from 'zod';
import { createZodDto } from '../common/validation';

/**
 * Report intake input.
 *
 * Deliberately small. This form is filled in on a phone, on a rural connection,
 * by someone who may be doing it for the first time, and every required field
 * is a reason to abandon it. The text and a location are all that is asked for;
 * everything else — category, severity, which problem this belongs to — the
 * pipeline works out, and an officer can correct.
 */

/** The categories a citizen may pick from, if they choose to. */
export const REPORT_CATEGORIES = [
  'water',
  'roads',
  'drainage',
  'streetlight',
  'waste',
  'bridge',
  'sanitation',
  'school',
  'health',
] as const;

export const REPORT_URGENCY = ['critical', 'high', 'medium', 'low'] as const;

export class CreateReportDto extends createZodDto(
  z.object({
    /**
     * What the citizen wrote, in their language, verbatim.
     *
     * The floor is 10 characters rather than 1 because "water" is not a report
     * anyone can act on; the ceiling is 4000 because somebody will paste a
     * village meeting's minutes and that should not 500.
     */
    text: z.string().trim().min(10, 'please describe the problem in a sentence or two').max(4000),

    /** Optional: the pipeline classifies the text if this is absent. */
    category: z.enum(REPORT_CATEGORIES).optional(),

    /** Optional: what the citizen thinks the urgency is. Advisory, not binding. */
    urgency: z.enum(REPORT_URGENCY).optional(),

    /**
     * Where. The village is resolved from the coordinates against the register,
     * so the citizen is never asked to identify their own administrative unit.
     */
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),

    /** Set when the citizen knows better than the coordinates — rare. */
    villageId: z.string().trim().min(1).max(64).optional(),

    /**
     * Uploaded attachment ids. Storage lands in stage 06; until then this is
     * accepted and recorded as a count, so the intake contract does not change
     * under the client when it does.
     */
    photoIds: z.array(z.string().trim().min(1).max(200)).max(8).optional(),

    /**
     * A name to be called by. Optional, and never required — a person reporting
     * a broken handpump should not have to identify themselves to do it.
     */
    citizenName: z.string().trim().min(2).max(120).optional(),

    /** BCP-47-ish. Defaults to Hindi, which is what most of these arrive in. */
    language: z.string().trim().min(2).max(12).default('hi'),
  }),
) {}

export class MyReportsQueryDto extends createZodDto(
  z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().max(200).optional(),
  }),
) {}
