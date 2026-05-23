import {
  Controller,
  Get,
  Patch,
  Req,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';
import { SseService } from './services/sse.service';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private sseService: SseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  findAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.findAll(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream for notification count' })
  stream(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    const subject = this.sseService.getStream(userId);

    req.on('close', () => {
      this.sseService.removeStream(userId);
    });

    return subject.asObservable().pipe(
      map(
        (event) =>
          ({
            data: JSON.stringify(event),
            type: event.type,
          }) as MessageEvent,
      ),
    );
  }
}
