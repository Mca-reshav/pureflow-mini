import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../../decorators/roles.decorator';
import { CreateAuditDto } from './dto/create-audit.dto';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.BM)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get audit events' })
  findAll(@Query() query: CreateAuditDto) {
    return this.auditService.findAll(query);
  }
}
