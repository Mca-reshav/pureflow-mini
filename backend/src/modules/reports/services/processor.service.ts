/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from './minio.service';
import {
  ReportGeneratorService,
  ReportPermSnapshot,
} from './generator.service';
import {
  JOB_SLUG,
  QUEUE_SLUG,
} from 'src/modules/notifications/notification.constant';
import dayjs from 'dayjs';

@Processor(QUEUE_SLUG.REPORT_EXPORT)
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    private reportGenerator: ReportGeneratorService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOB_SLUG.REPORT_EXPORT)
      await this.handleReportExport(job.data.jobId as string);
  }

  private async handleReportExport(jobId: string): Promise<void> {
    this.logger.log(`Processing report job :: ${jobId}`);

    await this.prisma.reportJob.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const job = await this.prisma.reportJob.findUnique({
        where: { id: jobId },
      });
      if (!job) throw new Error(`Job not found :: ${jobId}`);

      const baseSnapshot =
        job.permissionSnapshot as unknown as ReportPermSnapshot;
      const snapshot: ReportPermSnapshot = {
        ...baseSnapshot,
        projectId: job.projectId ?? baseSnapshot.projectId,
        dateFrom: job.dateFrom?.toISOString() ?? baseSnapshot.dateFrom,
        dateTo: job.dateTo?.toISOString() ?? baseSnapshot.dateTo,
      };

      let buffer: Buffer, filename: string, mimeType: string;
      const actualName = `report_${jobId}_${Date.now()}`;

      if (job.format === 'xlsx') {
        buffer = await this.reportGenerator.generateXlsx(snapshot);
        filename = `${actualName}.xlsx`;
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        buffer = await this.reportGenerator.generateCsv(snapshot);
        filename = `${actualName}.csv`;
        mimeType = 'text/csv';
      }

      const storagePath = `reports/${filename}`;
      await this.minioService.uploadBuffer(storagePath, buffer, mimeType);
      const sizeBytes = await this.minioService.getObjectSize(storagePath);

      await Promise.all([
        this.prisma.reportArtifact.create({
          data: {
            jobId,
            filename,
            mimeType,
            sizeBytes,
            storagePath,
            expiresAt: dayjs().add(7, 'day').toDate(),
          },
        }),
        this.prisma.reportJob.update({
          where: { id: jobId },
          data: { status: 'completed', completedAt: new Date() },
        }),
      ]);

      this.logger.log(`Report job completed :: ${jobId} :: ${filename}`);
    } catch (error) {
      this.logger.error(`Report job failed :: ${jobId}`, error);
      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }
}
