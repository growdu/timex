import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FACE_CONFIG, loadFaceConfig } from '../config/face.config';
import { Moment } from '../moments/moment.entity';
import { UserFaceEmbedding } from './entities/user-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { CloudFaceProvider } from './providers/cloud.face-provider';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { LocalFaceProvider } from './providers/local.face-provider';
import { MockFaceProvider } from './providers/mock.face-provider';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Moment, UserFaceEmbedding, MomentFace]),
  ],
  providers: [
    { provide: FACE_CONFIG, useFactory: loadFaceConfig },
    MockFaceProvider,
    CloudFaceProvider,
    LocalFaceProvider,
    FaceProviderFactory,
  ],
  exports: [FaceProviderFactory],
})
export class FaceModule {}
