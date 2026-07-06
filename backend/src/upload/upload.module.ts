import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ensureBucket, getS3Client, S3_CLIENT } from './s3.client';
import { AwsSdkError } from '../common/types/aws-error';

export { S3_CLIENT };

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: S3_CLIENT,
      useFactory: () => getS3Client(),
    },
  ],
  exports: [UploadService, S3_CLIENT],
})
export class UploadModule implements OnModuleInit {
  private readonly logger = new Logger(UploadModule.name);

  async onModuleInit() {
    try {
      await ensureBucket();
      this.logger.log('S3 bucket ready');
    } catch (err) {
      const awsErr = err as AwsSdkError;
      this.logger.warn(`ensureBucket failed: ${awsErr?.message || err}`);
    }
  }
}
