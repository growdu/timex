import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { ensureBucket, getS3Client } from './s3.client';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: 'S3_CLIENT',
      useFactory: () => getS3Client(),
    },
  ],
  exports: [UploadService],
})
export class UploadModule implements OnModuleInit {
  private readonly logger = new Logger(UploadModule.name);

  async onModuleInit() {
    try {
      await ensureBucket();
      this.logger.log('S3 bucket ready');
    } catch (err: any) {
      this.logger.warn(`ensureBucket failed: ${err?.message || err}`);
    }
  }
}
