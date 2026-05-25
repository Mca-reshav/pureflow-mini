import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  private accessKey: string;
  private secretKey: string;
  private publicHost: string;
  private publicPort: number;
  private publicSsl: boolean;

  constructor(private config: ConfigService) {
    this.accessKey = this.config.get<string>('MINIO_ROOT_USER')!;
    this.secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD')!;
    this.publicHost = this.config.get<string>('MINIO_PUBLIC_HOST', 'localhost');
    this.publicPort = this.config.get<number>('MINIO_PUBLIC_PORT', 9000);
    this.publicSsl = this.config.get<boolean>('MINIO_PUBLIC_SSL', false);

    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'minio'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: false,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'reports')!;
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

  getPresignedUrl(objectName: string, expirySeconds = 3600): string {
    const now = new Date();
    const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = now.toISOString().replace(/[:-]/g, '').slice(0, 15) + 'Z';

    const region = this.config.get<string>('MINIO_REGION', 'ap-south-1'),
      publicHost = this.config.get<string>('MINIO_PUBLIC_HOST', 'localhost'),
      publicPort = this.config.get<number>('MINIO_PUBLIC_PORT', 9000),
      protocol =
        this.config.get('MINIO_PUBLIC_SSL', 'false') === 'true'
          ? 'https'
          : 'http',
      accessKey = this.config.get<string>('MINIO_ROOT_USER'),
      secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD');

    const host = `${publicHost}:${publicPort}`,
      path = `/${this.bucket}/${objectName}`,
      credentialScope = `${datestamp}/${region}/s3/aws4_request`,
      credential = `${accessKey}/${credentialScope}`;

    const queryParts: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': timestamp,
      'X-Amz-Expires': String(expirySeconds),
      'X-Amz-SignedHeaders': 'host',
    };

    const sortedQuery = Object.keys(queryParts)
      .sort()
      .map(
        (k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParts[k])}`,
      )
      .join('&');

    const canonicalRequest = [
      'GET',
      path,
      sortedQuery,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key: Buffer | string, data: string): Buffer =>
      crypto.createHmac('sha256', key).update(data).digest();

    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${secretKey}`, datestamp), region), 's3'),
      'aws4_request',
    );

    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    return `${protocol}://${host}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;
  }

  async getObjectSize(objectName: string): Promise<number> {
    const stat = await this.client.statObject(this.bucket, objectName);
    return stat.size;
  }
}
