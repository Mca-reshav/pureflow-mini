import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from './services/minio.service';
import { Role } from '@prisma/client';
import { JOB_SLUG, QUEUE_SLUG } from '../notifications/notification.constant';
import { CreateReportDto } from './dto/create-report.dto';

const baseSelect = {
  id: true,
  status: true,
  format: true,
  errorMessage: true,
  queuedAt: true,
  completedAt: true,
};
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    @InjectQueue(QUEUE_SLUG.REPORT_EXPORT) private reportsQueue: Queue,
  ) {}

  async createExportJob(dto: CreateReportDto, userId: string, role: Role) {
    try {
      const permissionSnapshot = {
        userId,
        role,
        projectId: dto.projectId ?? null,
        canViewExpectedMinutes: role !== Role.ANALYST,
        canViewAllMembers: role !== Role.ANALYST,
        requestedAt: new Date().toISOString(),
      };

      const job = await this.prisma.reportJob.create({
        data: {
          requestedBy: userId,
          projectId: dto.projectId ?? null,
          dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : null,
          dateTo: dto.dateTo ? new Date(dto.dateTo) : null,
          format: dto.format ?? 'csv',
          status: 'queued',
          permissionSnapshot,
        },
        select: { id: true, status: true, format: true, queuedAt: true },
      });

      await this.reportsQueue.add(
        JOB_SLUG.REPORT_EXPORT,
        { jobId: job.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
      );

      this.logger.log(`Report job queued :: ${job.id}`);

      return {
        success: true,
        data: { jobId: job.id, status: 'queued', format: job.format },
        message: 'Report export queued',
      };
    } catch (error) {
      this.logger.error('Error in createExportJob', error);
      return { success: false, message: 'Failed to queue report export' };
    }
  }

  async listJobs(userId: string, role: Role) {
    try {
      const where = role === Role.ANALYST ? { requestedBy: userId } : {};

      const jobs = await this.prisma.reportJob.findMany({
        where,
        select: {
          ...baseSelect,
          artifact: { select: { id: true, filename: true, sizeBytes: true } },
        },
        orderBy: { queuedAt: 'desc' },
        take: 20,
      });

      return { success: true, data: jobs, message: 'Jobs fetched success' };
    } catch (error) {
      this.logger.error('Error in listJobs', error);
      return { success: false, data: [], message: 'Failed to fetch jobs' };
    }
  }

  async getJobStatus(jobId: string, userId: string, role: Role) {
    try {
      const job = await this.prisma.reportJob.findUnique({
        where: { id: jobId },
        select: {
          ...baseSelect,
          startedAt: true,
          requestedBy: true,
          artifact: {
            select: {
              id: true,
              filename: true,
              sizeBytes: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
      });

      if (!job) return { success: false, message: 'Job not found' };

      if (role === Role.ANALYST && job.requestedBy !== userId)
        return { success: false, message: 'Not your job' };

      return {
        success: true,
        data: job,
        message: 'Job status fetched success',
      };
    } catch (error) {
      this.logger.error('Error in getJobStatus', error);
      return { success: false, message: 'Failed to fetch job status' };
    }
  }

  async getDownloadUrl(artifactId: string, userId: string, role: Role) {
    try {
      const artifact = await this.prisma.reportArtifact.findUnique({
        where: { id: artifactId },
        include: { job: { select: { requestedBy: true } } },
      });

      if (!artifact) return { success: false, message: 'Artifact not found' };

      if (role === Role.ANALYST && artifact.job.requestedBy !== userId)
        return { success: false, message: 'Not your artifact' };

      await this.prisma.reportArtifact.update({
        where: { id: artifactId },
        data: { downloadCount: { increment: 1 } },
      });

      const signedUrl = this.minioService.getPresignedUrl(artifact.storagePath);

      return {
        success: true,
        data: {
          signedUrl,
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          sizeBytes: artifact.sizeBytes,
        },
        message: 'Download URL ready',
      };
    } catch (error) {
      this.logger.error('Error in getDownloadUrl', error);
      return { success: false, message: 'Failed to get download URL' };
    }
  }
}
