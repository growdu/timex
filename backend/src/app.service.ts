import { Inject, Injectable, Optional } from '@nestjs/common';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { s3Config } from './upload/upload.config';
import { S3_CLIENT } from './upload/s3.client';

export interface ComponentStatus {
  status: 'ok' | 'error' | 'disabled';
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSec: number;
  components: {
    api: ComponentStatus;
    s3: ComponentStatus;
  };
}

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(
    @Optional() @Inject(S3_CLIENT) private readonly s3Client?: S3Client,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthReport> {
    const components = {
      api: await this.checkApi(),
      s3: await this.checkS3(),
    };

    const allOk = Object.values(components).every(
      (c) => c.status === 'ok' || c.status === 'disabled',
    );

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor((Date.now() - this.startTime) / 1000),
      components,
    };
  }

  private async checkApi(): Promise<ComponentStatus> {
    // API 自身可达即 OK
    return { status: 'ok', latencyMs: 0 };
  }

  private async checkS3(): Promise<ComponentStatus> {
    if (!this.s3Client) {
      return { status: 'disabled' };
    }
    const start = Date.now();
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: s3Config.bucket }));
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
      // 404 / NoSuchBucket 也算"配置可达"——但要分清楚
      const code = err?.$metadata?.httpStatusCode;
      if (code === 404) {
        // bucket 不存在但 endpoint 可达 → degraded
        return {
          status: 'error',
          latencyMs: Date.now() - start,
          error: 'bucket not found',
        };
      }
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: err?.message ?? 'unknown',
      };
    }
  }
}