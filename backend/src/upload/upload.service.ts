import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { s3Config } from './upload.config';
import { AwsSdkError } from '../common/types/aws-error';

export type UploadKind = 'photo' | 'video' | 'audio' | 'document';

const KIND_MIME: Record<UploadKind, string[]> = {
  photo: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ],
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'audio/ogg',
    'audio/x-m4a',
    'audio/mp4',
  ],
  document: ['application/pdf'],
};

const KIND_MAX_SIZE: Record<UploadKind, number> = {
  photo: 20 * 1024 * 1024, // 20 MB
  video: 500 * 1024 * 1024, // 500 MB
  audio: 50 * 1024 * 1024, // 50 MB
  document: 10 * 1024 * 1024, // 10 MB
};

export interface PresignResult {
  key: string;
  url: string;
  expiresAt: string;
  maxSize: number;
}

export interface CompleteResult {
  key: string;
  url: string;
  fileSize: number;
  contentType: string;
  width?: number;
  height?: number;
  duration?: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(@Inject('S3_CLIENT') private readonly s3: S3Client) {}

  /**
   * 步骤 1：客户端拿到签名 URL → 用 PUT 上传文件
   *
   * 校验 mime 白名单 + size 上限；key 强制前缀 `uploads/{userId}/`
   * 防止越权（A 用户的签名不能写到 B 用户的路径）
   */
  async presign(
    userId: string,
    kind: UploadKind,
    mimeType: string,
    fileSize: number,
  ): Promise<PresignResult> {
    if (!KIND_MIME[kind]) {
      throw new BadRequestException(`unsupported kind: ${kind}`);
    }
    if (!KIND_MIME[kind].includes(mimeType)) {
      throw new BadRequestException(
        `${kind} requires one of: ${KIND_MIME[kind].join(', ')} (got: ${mimeType})`,
      );
    }
    const maxSize = Math.min(KIND_MAX_SIZE[kind], s3Config.maxUploadSize);
    if (fileSize <= 0 || fileSize > maxSize) {
      throw new BadRequestException(
        `fileSize must be in (0, ${maxSize}] bytes (got: ${fileSize})`,
      );
    }

    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    const objectKey = `uploads/${userId}/${kind}/${Date.now()}-${this._randomHex(8)}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: objectKey,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: s3Config.presignedTtl,
    });

    return {
      key: objectKey,
      url,
      expiresAt: new Date(
        Date.now() + s3Config.presignedTtl * 1000,
      ).toISOString(),
      maxSize,
    };
  }

  /**
   * 步骤 2：客户端上传完成 → 后端校验文件确实存在
   *
   * 强校验：HeadObject 拿真实 ContentLength / ContentType，
   * 防止客户端伪造 size 触发下一步处理。
   */
  async complete(
    userId: string,
    key: string,
    meta: { width?: number; height?: number; duration?: number } = {},
  ): Promise<CompleteResult> {
    this._assertOwnership(userId, key);

    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: s3Config.bucket, Key: key }),
      );

      const fileSize = Number(head.ContentLength ?? 0);
      const contentType = head.ContentType ?? 'application/octet-stream';

      this.logger.log(
        `complete key=${key} size=${fileSize} type=${contentType} user=${userId}`,
      );

      return {
        key,
        url: this._publicUrl(key),
        fileSize,
        contentType,
        ...(meta.width !== undefined ? { width: meta.width } : {}),
        ...(meta.height !== undefined ? { height: meta.height } : {}),
        ...(meta.duration !== undefined ? { duration: meta.duration } : {}),
      };
    } catch (err) {
      const awsErr = err as AwsSdkError;
      if (
        awsErr?.$metadata?.httpStatusCode === 404 ||
        awsErr?.name === 'NotFound'
      ) {
        throw new BadRequestException(
          `object not found: ${key} (upload may have failed)`,
        );
      }
      throw err;
    }
  }

  /**
   * 删除对象。带所有权校验：key 必须以 `uploads/{userId}/` 开头。
   */
  async remove(userId: string, key: string): Promise<void> {
    this._assertOwnership(userId, key);
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: key }),
    );
  }

  /** 公开访问 URL（前端用于 <img src=...>） */
  private _publicUrl(key: string): string {
    return `${s3Config.publicUrl.replace(/\/+$/, '')}/${key}`;
  }

  /** 强校验 key 前缀匹配 userId */
  private _assertOwnership(userId: string, key: string): void {
    const prefix = `uploads/${userId}/`;
    if (!key.startsWith(prefix)) {
      throw new ForbiddenException(`key "${key}" not owned by user ${userId}`);
    }
  }

  private _randomHex(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }
}
