import { Injectable } from '@nestjs/common';
import { AuditActor, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  entityType: string;
  entityId: string;
  actor: AuditActor;
  action: string;
  detail?: string;
  actorUserId?: string;
  actorName?: string;
  /** Defaults to true for AI/System actors, false otherwise. */
  automated?: boolean;
  /** Link to a problem so `/problems/:id/audit` can read it back. */
  problemId?: string;
}

/**
 * The single writer of the audit trail.
 *
 * Every workflow transition writes here — from the store action in apps/web that
 * used to append to an in-memory array. Accepts a transaction client so a
 * mutation and its audit rows commit together.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditInput, tx?: Prisma.TransactionClient): Promise<{ id: string }> {
    const client = tx ?? this.prisma;
    return client.auditEntry.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        problemId: input.problemId ?? (input.entityType === 'problem' ? input.entityId : null),
        actor: input.actor,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        detail: input.detail ?? null,
        automated: input.automated ?? (input.actor === 'AI' || input.actor === 'System'),
      },
      select: { id: true },
    });
  }

  recordMany(inputs: AuditInput[], tx?: Prisma.TransactionClient): Promise<unknown> {
    const client = tx ?? this.prisma;
    return client.auditEntry.createMany({
      data: inputs.map((input) => ({
        entityType: input.entityType,
        entityId: input.entityId,
        problemId: input.problemId ?? (input.entityType === 'problem' ? input.entityId : null),
        actor: input.actor,
        actorUserId: input.actorUserId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        detail: input.detail ?? null,
        automated: input.automated ?? (input.actor === 'AI' || input.actor === 'System'),
      })),
    });
  }

  async forProblem(problemId: string) {
    return this.prisma.auditEntry.findMany({
      where: { problemId },
      orderBy: { at: 'asc' },
    });
  }
}
