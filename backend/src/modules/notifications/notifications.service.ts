import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { JOB_SLUG, QUEUE_SLUG } from './notification.constant';

const baseOpt = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_SLUG.NOTIFICATIONS) private notifyQueue: Queue,
  ) {}

  async findAll(userId: string) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          entityType: true,
          entityId: true,
          isRead: true,
          createdAt: true,
          readAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return {
        success: true,
        data: notifications,
        message: 'Notifications fetched success',
      };
    } catch (error) {
      this.logger.error('Error in findAll', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch notifications',
      };
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
      return { success: true, data: { unreadCount: count }, message: 'OK' };
    } catch (error) {
      this.logger.error('Error in getUnreadCount', error);
      return { success: false, data: { unreadCount: 0 }, message: 'Failed' };
    }
  }

  async markAllRead(userId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      return { success: true, message: 'All notifications marked as read' };
    } catch (error) {
      this.logger.error('Error in markAllRead', error);
      return {
        success: false,
        message: 'Failed to mark notifications as read',
      };
    }
  }

  async emitTaskAssigned(data: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assignedBy: string;
  }) {
    try {
      await this.notifyQueue.add(
        JOB_SLUG.TASK_ASSIGNED,
        {
          ...data,
          eventId: `task_assigned:${data.taskId}:${data.assigneeId}`,
        },
        baseOpt,
      );
      this.logger.log(
        `Queued :: ${JOB_SLUG.TASK_ASSIGNED} :: ${data.assigneeId}`,
      );
    } catch (error) {
      this.logger.error(`Error queuing ${JOB_SLUG.TASK_ASSIGNED}`, error);
    }
  }

  async emitMemberAdded(data: {
    projectId: string;
    projectName: string;
    userId: string;
    addedBy: string;
  }) {
    try {
      await this.notifyQueue.add(
        JOB_SLUG.MEMBER_ADDED,
        {
          ...data,
          eventId: `member_added:${data.projectId}:${data.userId}`,
        },
        baseOpt,
      );
      this.logger.log(`Queued :: ${JOB_SLUG.MEMBER_ADDED} :: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Error queuing ${JOB_SLUG.MEMBER_ADDED}`, error);
    }
  }

  async emitTimeLate(data: {
    timeEntryId: string;
    taskTitle: string;
    userId: string;
    managerId: string;
  }) {
    try {
      await this.notifyQueue.add(
        JOB_SLUG.TIME_LATE,
        {
          ...data,
          eventId: `time_late:${data.timeEntryId}`,
        },
        baseOpt,
      );
      this.logger.log(
        `Queued :: ${JOB_SLUG.TIME_LATE} :: bm=${data.managerId}`,
      );
    } catch (error) {
      this.logger.error(`Error queuing ${JOB_SLUG.TIME_LATE}`, error);
    }
  }

  async emitRoleChanged(userId: string, actorId: string, change: string) {
    try {
      const data = { userId, actorId, change };
      await this.notifyQueue.add(
        JOB_SLUG.ROLE_CHANGED,
        {
          ...data,
          eventId: `role_changed:${data.userId}`,
        },
        baseOpt,
      );
      this.logger.log(`Queued :: ${JOB_SLUG.ROLE_CHANGED}`);
    } catch (error) {
      this.logger.error(`Error queuing ${JOB_SLUG.ROLE_CHANGED}`, error);
    }
  }

  async emitSessionEnded(sessionId: string, userId: string) {
    try {
      const data = { sessionId, userId };
      await this.notifyQueue.add(
        JOB_SLUG.SESSION_ENDED,
        {
          ...data,
          eventId: `session_ended:${sessionId}`,
        },
        baseOpt,
      );
      this.logger.log(
        `Queued :: ${JOB_SLUG.SESSION_ENDED} :: sessionId=${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Error queuing ${JOB_SLUG.SESSION_ENDED}`, error);
    }
  }
}
