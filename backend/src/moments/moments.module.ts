import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { Moment } from './moment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Moment])],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
