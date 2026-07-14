import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  userId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'DEACTIVATE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'CANCEL'
    | 'SIGN'
    | 'DISPENSE'
    | 'OPEN'
    | 'CLOSE'
    | 'QUEUE_CALL'
    | 'CHECK_IN'
    | 'OTHER';
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private prisma: PrismaService) {}

  async log(input: AuditInput) {
    try {
      await this.prisma.audit.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          oldData: input.oldData as object | undefined,
          newData: input.newData as object | undefined,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (e) {
      // No debe romper el flujo principal si falla la auditoría
      this.logger.error(
        `Audit log failed for ${input.entity}:${input.entityId ?? '-'} by ${input.userId}`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }
}
