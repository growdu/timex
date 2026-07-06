/**
 * S3 存储配置（S3 协议兼容：MinIO / Aliyun OSS / AWS S3）
 */
export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  presignedTtl: number;
  maxUploadSize: number;
  forcePathStyle: boolean;
}

export const s3Config: S3Config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  bucket: process.env.S3_BUCKET || 'timex-uploads',
  publicUrl: process.env.S3_PUBLIC_URL || 'http://localhost:9000/timex-uploads',
  presignedTtl: Number(process.env.S3_PRESIGNED_TTL) || 900,
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024,
  // MinIO / Aliyun OSS 需要 path-style；AWS S3 需 virtual-hosted
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
};
