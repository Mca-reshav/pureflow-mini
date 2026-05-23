import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SseService } from './sse.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JOB_SLUG, QUEUE_SLUG } from '../notification.constant';

@Processor(QUEUE_SLUG.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private sseService: SseService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job :: ${job.name}`);

    switch (job.name) {
      case JOB_SLUG.TASK_ASSIGNED:
        await this.handleTaskAssigned(job.data);
        break;
      case JOB_SLUG.MEMBER_ADDED:
        await this.handleMemberAdded(job.data);
        break;
      case JOB_SLUG.TIME_LATE:
        await this.handleTimeLate(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleTaskAssigned(data: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assignedBy: string;
    eventId: string;
  }) {
    try {
      const existing = await this.prisma.notification.findUnique({
        where: { eventId: data.eventId },
      });
      if (existing) {
        this.logger.log(`Duplicate event skipped :: ${data.eventId}`);
        return;
      }

      const [_, unreadCount] = await Promise.all([
        this.prisma.notification.create({
          data: {
            userId: data.assigneeId,
            type: 'task_assigned',
            title: 'New task assigned',
            body: `You have been assigned task: "${data.taskTitle}"`,
            entityType: 'task',
            entityId: data.taskId,
            eventId: data.eventId,
          },
        }),
        this.prisma.notification.count({
          where: { userId: data.assigneeId, isRead: false },
        }),
      ]);

      this.sseService.pushNotificationCount(data.assigneeId, unreadCount);

      this.logger.log(
        `Notification created :: task_assigned  :: ${data.assigneeId}`,
      );
    } catch (error) {
      this.logger.error('Error handling task.assigned', error);
      throw error;
    }
  }

  private async handleMemberAdded(data: {
    projectId: string;
    projectName: string;
    userId: string;
    addedBy: string;
    eventId: string;
  }) {
    try {
      const existing = await this.prisma.notification.findUnique({
        where: { eventId: data.eventId },
      });
      if (existing) return;

      const [_, unreadCount] = await Promise.all([
        this.prisma.notification.create({
          data: {
            userId: data.userId,
            type: 'project_member_added',
            title: 'Added to project',
            body: `You have been added to project: "${data.projectName}"`,
            entityType: 'project',
            entityId: data.projectId,
            eventId: data.eventId,
          },
        }),
        this.prisma.notification.count({
          where: { userId: data.userId, isRead: false },
        }),
      ]);

      this.sseService.pushNotificationCount(data.userId, unreadCount);

      this.logger.log(
        `Notification created :: project_member_added :: ${data.userId}`,
      );
    } catch (error) {
      this.logger.error('Error handling project.member.added', error);
      throw error;
    }
  }

  private async handleTimeLate(data: {
    timeEntryId: string;
    taskTitle: string;
    userId: string;
    managerId: string;
    eventId: string;
  }) {
    try {
      const existing = await this.prisma.notification.findUnique({
        where: { eventId: data.eventId },
      });
      if (existing) return;

      const [_, unreadCount] = await Promise.all([
        this.prisma.notification.create({
          data: {
            userId: data.managerId,
            type: 'time_late_logged',
            title: 'Late time entry logged',
            body: `A late time entry was logged for task: "${data.taskTitle}"`,
            entityType: 'time_entry',
            entityId: data.timeEntryId,
            eventId: data.eventId,
          },
        }),
        this.prisma.notification.count({
          where: { userId: data.managerId, isRead: false },
        }),
      ]);

      this.sseService.pushNotificationCount(data.managerId, unreadCount);

      this.logger.log(
        `Notification created :: time_late_logged :: bm=${data.managerId}`,
      );
    } catch (error) {
      this.logger.error('Error handling time.late_logged', error);
      throw error;
    }
  }
}
