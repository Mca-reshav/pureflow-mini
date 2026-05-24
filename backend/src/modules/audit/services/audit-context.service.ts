/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditContextService {
  private readonly logger = new Logger(AuditContextService.name);

  constructor(private prisma: PrismaService) {}
  async getBeforeState(
    entityType: string,
    entityId: string | undefined,
  ): Promise<any | null> {
    if (!entityId) return null;

    try {
      switch (entityType) {
        case 'users':
          return this.prisma.user.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          });

        case 'projects':
          return this.prisma.project.findUnique({
            where: { id: entityId },
            select: { id: true, name: true, description: true, status: true },
          });

        case 'tasks':
          return this.prisma.task.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              assigneeId: true,
              expectedMinutes: true,
              dueDate: true,
            },
          });

        case 'time-entries':
          return this.prisma.timeEntry.findUnique({
            where: { id: entityId },
            select: {
              id: true,
              minutes: true,
              entryDate: true,
              notes: true,
              isLate: true,
            },
          });

        case 'notifications':
          return this.prisma.notification.findUnique({
            where: { id: entityId },
            select: { id: true, isRead: true },
          });

        default:
          return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch before state for ${entityType} :: ${entityId}`,
        error,
      );
      return null;
    }
  }

  diffStates(before: any, after: any): { before: any; after: any } {
    if (!before || !after) return { before, after };

    const changedBefore: any = {},
      changedAfter: any = {},
      skipKeys = ['assignee', 'assigneeId', 'updatedAt'],
      allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (skipKeys.includes(key)) continue;
      const bVal = JSON.stringify(before[key]);
      const aVal = JSON.stringify(after[key]);
      if (bVal !== aVal) {
        changedBefore[key] = before[key];
        changedAfter[key] = after[key];
      }
    }

    if (Object.keys(changedBefore).length === 0) return { before, after };

    return { before: changedBefore, after: changedAfter };
  }
}
