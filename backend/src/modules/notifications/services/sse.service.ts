import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseEvent {
  type: string;
  data: any;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly connections = new Map<string, Subject<SseEvent>>();

  getStream(userId: string): Subject<SseEvent> {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Subject<SseEvent>());
      this.logger.log(`SSE connection opened :: ${userId}`);
    }
    return this.connections.get(userId)!;
  }

  removeStream(userId: string) {
    const subject = this.connections.get(userId);
    if (subject) {
      subject.complete();
      this.connections.delete(userId);
      this.logger.log(`SSE connection closed :: ${userId}`);
    }
  }

  pushNotificationCount(userId: string, unreadCount: number) {
    const subject = this.connections.get(userId);
    if (subject) {
      subject.next({
        type: 'notification.count',
        data: { unreadCount },
      });
    }
  }

  pushEvent(userId: string, event: SseEvent) {
    const subject = this.connections.get(userId);
    if (subject) subject.next(event);
  }

  getActiveConnections(): number {
    return this.connections.size;
  }
}
