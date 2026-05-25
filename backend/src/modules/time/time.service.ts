import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CreateTimeEntryDto } from './dto/create-time.dto';
import { UpdateTimeEntryDto } from './dto/update-time.dto';
import { baseSelect, populated, versionsSelect } from './time.utils';
import dayjs from 'dayjs';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TimeService {
  private readonly logger = new Logger(TimeService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(userId: string, role: Role, taskId?: string) {
    try {
      const where: Prisma.TimeEntryWhereInput = {};

      if (taskId) where.taskId = taskId;
      if (role === Role.ANALYST) where.userId = userId;

      const entries = await this.prisma.timeEntry.findMany({
        where,
        select: {
          ...baseSelect,
          updatedAt: true,
          task: populated.task,
          user: { select: { id: true, name: true, email: true } },
          versions: {
            ...versionsSelect,
            orderBy: { versionNo: 'asc' },
          },
        },
        orderBy: { entryDate: 'desc' },
      });

      return {
        success: true,
        data: entries,
        message: 'Time entries fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch time entries',
      };
    }
  }

  async findOne(id: string, userId: string, role: Role) {
    try {
      const entry = await this.prisma.timeEntry.findUnique({
        where: { id },
        select: {
          ...baseSelect,
          updatedAt: true,
          task: populated.task,
          user: { select: { id: true, name: true, email: true } },
          versions: {
            ...versionsSelect,
            orderBy: { versionNo: 'asc' },
          },
        },
      });

      if (!entry) return { success: false, message: 'Time entry not found' };

      if (role === Role.ANALYST && entry.user.id !== userId)
        return { success: false, message: 'Your time entry not found' };

      return {
        success: true,
        data: entry,
        message: 'Time entry fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findOne', error);
      return { success: false, message: 'Failed to fetch time entry' };
    }
  }

  async create(dto: CreateTimeEntryDto, userId: string, role: Role) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: dto.taskId },
        select: { id: true, projectId: true, assigneeId: true },
      });

      if (!task) return { success: false, message: 'Task not found' };

      if (role === Role.ANALYST && task.assigneeId !== userId)
        return {
          success: false,
          message: 'Log time only your tasks',
        };

      // update from here
      const isExist = await this.prisma.timeEntry.findFirst({
        where: { taskId: task.id },
        select: { id: true },
      });

      if (isExist) {
        const resp = await this.update(isExist.id, dto, userId, role);
        if (resp.success) this.logger.log(`Time entry updated by ${userId}`);
        return resp;
      }
      const entryDate = new Date(dto.entryDate),
        isLate = this.isLateEntry(entryDate);

      const entry = await this.prisma.timeEntry.create({
        data: {
          taskId: dto.taskId,
          projectId: task.projectId,
          userId,
          minutes: dto.minutes,
          entryDate,
          notes: dto.notes ?? null,
          isLate,
        },
        select: {
          ...baseSelect,
          ...populated,
        },
      });

      if (isLate) {
        const [project, taskTitle] = await Promise.all([
          this.prisma.project.findUnique({
            where: { id: task.projectId },
            select: { ownerId: true },
          }),
          this.prisma.task.findUnique({
            where: { id: dto.taskId },
            select: { title: true },
          }),
        ]);

        if (project && taskTitle)
          await this.notificationsService.emitTimeLate({
            timeEntryId: entry.id,
            taskTitle: taskTitle?.title,
            userId,
            managerId: project?.ownerId ?? userId,
          });

        this.logger.warn(`Late time entry logged :: userId=${userId}`);
      }
      this.logger.log(`Time entry created :: ${dto.minutes}mins by ${userId}`);

      return {
        success: true,
        data: entry,
        message: isLate
          ? 'Time entry logged as late'
          : 'Time entry logged success',
      };
    } catch (error) {
      this.logger.error('Error in create', error);
      return { success: false, message: 'Failed to log time entry' };
    }
  }

  async update(
    id: string,
    dto: UpdateTimeEntryDto,
    userId: string,
    role: Role,
  ) {
    try {
      const entry = await this.prisma.timeEntry.findUnique({
        where: { id },
        include: {
          versions: {
            select: { versionNo: true },
            orderBy: { versionNo: 'desc' },
            take: 1,
          },
        },
      });

      if (!entry) return { success: false, message: 'Time entry not found' };

      if (role === Role.ANALYST && entry.userId !== userId)
        return { success: false, message: 'Your time entry not found' };

      const beforeJson = {
        minutes: entry.minutes,
        entryDate: entry.entryDate,
        notes: entry.notes,
        isLate: entry.isLate,
      };

      const entryDate = dto.entryDate
        ? new Date(dto.entryDate)
        : entry.entryDate;
      const isLate = this.isLateEntry(entryDate);

      const afterJson = {
        minutes: dto.minutes ?? entry.minutes,
        entryDate: dto.entryDate ?? entry.entryDate,
        notes: dto.notes ?? entry.notes,
        isLate,
      };

      const updateData: Prisma.TimeEntryUpdateInput = {
        ...(dto.minutes !== undefined && { minutes: dto.minutes }),
        ...(dto.entryDate && { entryDate }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        isLate,
      };

      const nextVersionNo =
        entry.versions.length > 0 ? entry.versions[0].versionNo + 1 : 1;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, ...newBase } = baseSelect;
      const [updated] = await this.prisma.$transaction([
        this.prisma.timeEntry.update({
          where: { id },
          data: updateData,
          select: {
            ...newBase,
            updatedAt: true,
            ...populated,
          },
        }),
        this.prisma.timeEntryVersion.create({
          data: {
            timeEntryId: id,
            versionNo: nextVersionNo,
            beforeJson,
            afterJson,
            editedBy: userId,
          },
        }),
      ]);

      this.logger.log(
        `Time entry updated :: version ${nextVersionNo} by ${userId}`,
      );

      return {
        success: true,
        data: updated,
        message: 'Time entry updated success',
      };
    } catch (error) {
      this.logger.error('Error in update', error);
      return { success: false, message: 'Failed to update time entry' };
    }
  }

  async remove(id: string, userId: string, role: Role) {
    try {
      const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
      if (!entry) return { success: false, message: 'Time entry not found' };

      if (role === Role.ANALYST && entry.userId !== userId)
        return { success: false, message: 'Your time entry not found' };

      await this.prisma.timeEntry.delete({ where: { id } });

      return { success: true, message: 'Time entry deleted success' };
    } catch (error) {
      this.logger.error('Error in remove', error);
      return { success: false, message: 'Failed to delete time entry' };
    }
  }

  private isLateEntry(entryDate: Date): boolean {
    const thresholdDays = this.config.get<number>('LATE_LOG_THRESHOLD', 2);

    const daysDiff = dayjs()
      .startOf('day')
      .diff(dayjs(entryDate).startOf('day'), 'day');

    return daysDiff > thresholdDays;
  }
}
