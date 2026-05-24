import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import * as commonInterface from 'src/common/common.interface';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List report jobs' })
  listJobs(@CurrentUser() user: commonInterface.IUser) {
    return this.reportsService.listJobs(user.id, user.role);
  }

  @Post('export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue report export' })
  @ApiResponse({ status: 202, description: 'Job queued success' })
  createExportJob(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: commonInterface.IUser,
  ) {
    return this.reportsService.createExportJob(dto, user.id, user.role);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Poll report job status' })
  getJobStatus(
    @Param('id') id: string,
    @CurrentUser() user: commonInterface.IUser,
  ) {
    return this.reportsService.getJobStatus(id, user.id, user.role);
  }

  @Get('artifacts/:id/download')
  @ApiOperation({ summary: 'Get download info' })
  getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: commonInterface.IUser,
  ) {
    return this.reportsService.getDownloadUrl(id, user.id, user.role);
  }
}
