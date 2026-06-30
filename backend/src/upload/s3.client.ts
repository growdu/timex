import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { s3Config } from './upload.config';

/**
 * S3Client 单例 + bucket 初始化
 *
 * 用工厂函数（而不是 module-level 立即执行）方便单测时 mock。
 */
let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      forcePathStyle: s3Config.forcePathStyle,
    });
  }
  return _client;
}

/** 测试用：重置单例 */
export function resetS3Client(): void {
  _client = null;
}

/**
 * 确保 bucket 存在；不存在则创建。
 * 启动时调用一次即可（best-effort，失败不抛）。
 */
export async function ensureBucket(): Promise<void> {
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: s3Config.bucket }));
  } catch (err: any) {
    // 404 / NoSuchBucket → 创建
    if (
      err?.$metadata?.httpStatusCode === 404 ||
      err?.name === 'NotFound' ||
      err?.name === 'NoSuchBucket'
    ) {
      await client.send(new CreateBucketCommand({ Bucket: s3Config.bucket }));
    } else {
      // 其它错误（网络/权限）记录但不抛
      // eslint-disable-next-line no-console
      console.warn('[upload] ensureBucket: head failed', err?.name || err);
    }
  }
}
