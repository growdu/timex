import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MemoirsController,
  PublicMemoirsController,
} from './memoirs.controller';
import { MemoirsService } from './memoirs.service';
import { Memoir } from './memoir.entity';
import { MemoirChapter } from './memoir-chapter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Memoir, MemoirChapter])],
  controllers: [MemoirsController, PublicMemoirsController],
  providers: [MemoirsService],
  exports: [MemoirsService],
})
export class MemoirsModule {}
