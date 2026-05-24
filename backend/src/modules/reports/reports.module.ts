import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportProcessor } from './services/processor.service';
import { QUEUE_SLUG } from '../notifications/notification.constant';
import { BullModule } from '@nestjs/bullmq';
import { MinioService } from './services/minio.service';
import { ReportGeneratorService } from './services/generator.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_SLUG.REPORT_EXPORT })],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportProcessor,
    MinioService,
    ReportGeneratorService,
  ],
  exports: [ReportsService, MinioService],
})
export class ReportsModule {}
