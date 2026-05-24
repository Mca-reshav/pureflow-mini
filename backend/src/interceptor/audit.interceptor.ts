/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from 'src/modules/audit/audit.service';
import { AuditContextService } from 'src/modules/audit/services/audit-context.service';

const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

const pathExt = (url: string) => url.split('?')[0].replace(/\/api\/v1/, '');
const partsExt = (path: string) => path.split('/').filter(Boolean);

const pathObj = Object.freeze({
  MEMBER: '/member',
  ASSIGN: '/assign',
  LOGIN: '/login',
  LOGOUT: '/logout',
  REFRESH: '/refresh',
  EXPORT: '/export',
  READ_ALL: '/read-all',
} as const);

function resolveAction(method: string, url: string): string {
  const path = pathExt(url),
    parts = partsExt(path),
    resource = parts[0] ?? 'unknown';

  switch (method) {
    case 'POST':
      if (path.includes(pathObj.MEMBER)) return `${resource}.member.added`;
      if (path.includes(pathObj.ASSIGN)) return `${resource}.assigned`;
      if (path.includes(pathObj.LOGIN)) return 'auth.login';
      if (path.includes(pathObj.LOGOUT)) return 'auth.logout';
      if (path.includes(pathObj.REFRESH)) return 'auth.refresh';
      if (path.includes(pathObj.EXPORT)) return 'report.export.queued';
      if (path.includes(pathObj.READ_ALL)) return 'notification.read_all';
      return `${resource}.created`;
    case 'PATCH':
      if (path.includes(pathObj.MEMBER)) return `${resource}.member.updated`;
      if (path.includes(pathObj.ASSIGN)) return `${resource}.assigned`;
      if (path.includes(pathObj.READ_ALL)) return 'notification.read_all';
      return `${resource}.updated`;
    case 'PUT':
      return `${resource}.updated`;
    case 'DELETE':
      if (path.includes(pathObj.MEMBER)) return `${resource}.member.removed`;
      return `${resource}.deleted`;
    default:
      return `${resource}.${method.toLowerCase()}`;
  }
}

function resolveEntityType(url: string): string {
  const path = pathExt(url),
    parts = partsExt(path);
  return parts[0] ?? 'unknown';
}
function resolveEntityId(url: string): string | undefined {
  const path = pathExt(url),
    parts = partsExt(path),
    values = Object.entries(pathObj).map(([key, value]) => value.slice(1)),
    skip = values.slice(1);
  return parts[1] && !skip.includes(parts[1]) ? parts[1] : undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private auditService: AuditService,
    private auditContextService: AuditContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    if (!WRITE_METHODS.includes(method)) return next.handle();

    const requestId = request['requestId'],
      action = resolveAction(method, url),
      entityType = resolveEntityType(url),
      entityId = resolveEntityId(url),
      needsBefore = WRITE_METHODS.slice(1).includes(method);

    return new Observable((subscriber) => {
      const fetchBefore = needsBefore
        ? this.auditContextService.getBeforeState(entityType, entityId)
        : Promise.resolve(null);

      fetchBefore
        .then((beforeState) => {
          next
            .handle()
            .pipe(
              tap(async (responseBody) => {
                try {
                  if (responseBody?.success === false) return;

                  let beforeJson = null;
                  let afterJson = this.sanitizeBody(body);

                  if (beforeState && responseBody?.data) {
                    const diff = this.auditContextService.diffStates(
                      beforeState,
                      responseBody.data,
                    );
                    beforeJson = diff.before;
                    afterJson = diff.after;
                  }

                  await this.auditService.createEvent({
                    actorId: user?.id ?? null,
                    action,
                    entityType,
                    entityId,
                    beforeJson,
                    afterJson,
                    requestId,
                    service: 'api',
                    ipHash: ip ?? null,
                  });
                } catch (error) {
                  this.logger.error('Audit interceptor tap error', error);
                }
              }),
            )
            .subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        })
        .catch((err) => {
          this.logger.error('Failed to fetch before state', err);
          next.handle().subscribe({
            next: (val) => subscriber.next(val),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        });
    });
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const { password, passwordHash, refreshToken, ...safe } = body;
    return safe;
  }
}
