import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditContextService } from './services/audit-context.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditContextService],
  exports: [AuditService],
})
export class AuditModule {}
