/**
 * AWS SDK v3 错误的常用字段。
 *
 * 用于 `catch (err: unknown)` 后的类型安全访问，避免 `any`。
 * AWS SDK 抛出的错误带 `$metadata` / `name`，但基类 S3ServiceException
 * 的 $metadata 在类型层面是可选的，这里统一收敛。
 */
export interface AwsSdkError {
  $metadata?: { httpStatusCode?: number };
  name?: string;
  message?: string;
}
