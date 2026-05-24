/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'minio'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.config.get<string>('MINIO_ROOT_USER'),
      secretKey: this.config.get<string>('MINIO_ROOT_PASSWORD'),
    });
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'reports');
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'ap-south-1');
        this.logger.log(`Bucket created :: ${this.bucket}`);
      } else this.logger.log(`Bucket exists :: ${this.bucket}`);
    } catch (error) {
      this.logger.error('Error ensuring MinIO bucket', error);
    }
  }

  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.client.putObject(
      this.bucket,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': mimeType,
      },
    );
    this.logger.log(`Uploaded :: ${objectName} :: ${buffer.length} bytes`);
    return objectName;
  }

  async getPresignedUrl(
    objectName: string,
    expirySeconds = 3600,
  ): Promise<string> {
    return await this.client.presignedGetObject(
      this.bucket,
      objectName,
      expirySeconds,
    );
  }

  async getObjectSize(objectName: string): Promise<number> {
    const stat = await this.client.statObject(this.bucket, objectName);
    return stat.size;
  }
}
