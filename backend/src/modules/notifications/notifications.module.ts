import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SseService } from './services/sse.service';
import { NotificationProcessor } from './services/processor.service';
import { QUEUE_SLUG } from './notification.constant';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_SLUG.NOTIFICATIONS,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, SseService],
  exports: [NotificationsService, SseService],
})
export class NotificationsModule {}
