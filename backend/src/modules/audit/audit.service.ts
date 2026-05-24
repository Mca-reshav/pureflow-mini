import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { Prisma } from '@prisma/client';

export interface ICreateAuditEvent {
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  requestId?: string;
  service?: string;
  ipHash?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private prisma: PrismaService) {}
  async createEvent(event: ICreateAuditEvent): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          actorId: event.actorId ?? null,
          action: event.action,
          entityType: event.entityType ?? null,
          entityId: event.entityId ?? null,
          beforeJson: event.beforeJson ?? undefined,
          afterJson: event.afterJson ?? undefined,
          requestId: event.requestId ?? null,
          service: event.service ?? 'api',
          ipHash: event.ipHash ?? null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit event', error);
    }
  }

  async findAll(query: CreateAuditDto) {
    try {
      const limit = Math.min(parseInt(query.limit ?? '50'), 100);
      const offset = parseInt(query.offset ?? '0');

      const where: Prisma.AuditEventWhereInput = {};
      if (query.entityType) where.entityType = query.entityType;
      if (query.action) where.action = { contains: query.action };

      const [events, total] = await Promise.all([
        this.prisma.auditEvent.findMany({
          where,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            beforeJson: true,
            afterJson: true,
            requestId: true,
            service: true,
            ipHash: true,
            createdAt: true,
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.auditEvent.count({ where }),
      ]);

      return {
        success: true,
        data: events,
        meta: { total, limit, offset },
        message: 'Audit events fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch audit events',
      };
    }
  }
}
