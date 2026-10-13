import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FACE_CONFIG, loadFaceConfig } from '../config/face.config';
import { Moment } from '../moments/moment.entity';
import { UserFaceEmbedding } from './entities/user-face-embedding.entity';
import { MomentFace } from './entities/moment-face.entity';
import { ScratchDump } from './entities/scratch-dump.entity';
import { ScratchDumpItem } from './entities/scratch-dump-item.entity';
import { CloudFaceProvider } from './providers/cloud.face-provider';
import { FaceProviderFactory } from './providers/face-provider.factory';
import { LocalFaceProvider } from './providers/local.face-provider';
import { MockFaceProvider } from './providers/mock.face-provider';
import { VectorSearchService } from './search/vector-search.service';
import { FaceJobHandler } from './jobs/face-job.handler';
import { FaceService } from './face.service';
import { FaceController } from './face.controller';
import { ScratchDumpService } from './scratch/scratch-dump.service';
import { ScratchDumpController } from './scratch/scratch-dump.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Moment,
      UserFaceEmbedding,
      MomentFace,
      ScratchDump,
      ScratchDumpItem,
    ]),
    forwardRef(() => AiModule),
  ],
  providers: [
    { provide: FACE_CONFIG, useFactory: loadFaceConfig },
    MockFaceProvider,
    CloudFaceProvider,
    LocalFaceProvider,
    FaceProviderFactory,
    VectorSearchService,
    FaceService,
    FaceJobHandler,
    ScratchDumpService,
  ],
  controllers: [FaceController, ScratchDumpController],
  exports: [
    FaceProviderFactory,
    FaceService,
    FaceJobHandler,
    ScratchDumpService,
  ],
})
export class FaceModule {}
