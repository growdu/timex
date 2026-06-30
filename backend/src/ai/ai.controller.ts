import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import {
  ImageTagDto,
  ImageSummaryDto,
  AudioTranscribeDto,
  MemoirSummaryDto,
  ChapterSummaryDto,
  EventSummaryDto,
} from './dto/ai.dto';

@Controller('api/ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private aiService: AiService) {}

  /** 提交图像打标签任务 */
  @Post('moments/:momentId/image-tag')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 20, ttl: 60_000 } })  // 20 次/分钟
  async tagImage(
    @Param('momentId') momentId: string,
    @Body() dto: ImageTagDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'image-tag',
      targetType: 'moment',
      targetId: momentId,
      promptInput: {
        kind: 'media-url',
        url: dto.mediaUrl,
        mimeType: dto.mimeType,
      },
    });
  }

  @Post('moments/:momentId/image-summary')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 20, ttl: 60_000 } })
  async summarizeImage(
    @Param('momentId') momentId: string,
    @Body() dto: ImageSummaryDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'image-summary',
      targetType: 'moment',
      targetId: momentId,
      promptInput: {
        kind: 'media-url',
        url: dto.mediaUrl,
        mimeType: dto.mimeType,
      },
    });
  }

  @Post('moments/:momentId/transcribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 10, ttl: 60_000 } })  // 音频更贵
  async transcribe(
    @Param('momentId') momentId: string,
    @Body() dto: AudioTranscribeDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'audio-transcribe',
      targetType: 'moment',
      targetId: momentId,
      promptInput: {
        kind: 'audio-url',
        url: dto.audioUrl,
        mimeType: dto.mimeType,
      },
    });
  }

  @Post('memoirs/:memoirId/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 5, ttl: 60_000 } })  // 最贵
  async summarizeMemoir(
    @Param('memoirId') memoirId: string,
    @Body() dto: MemoirSummaryDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'memoir-summary',
      targetType: 'memoir',
      targetId: memoirId,
      promptInput: { kind: 'text', text: dto.text ?? '' },
    });
  }

  @Post('chapters/:chapterId/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  async summarizeChapter(
    @Param('chapterId') chapterId: string,
    @Body() dto: ChapterSummaryDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'chapter-summary',
      targetType: 'chapter',
      targetId: chapterId,
      promptInput: { kind: 'text', text: dto.text ?? '' },
    });
  }

  @Post('events/:eventId/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ short: { limit: 20, ttl: 60_000 } })
  async summarizeEvent(
    @Param('eventId') eventId: string,
    @Body() dto: EventSummaryDto,
    @CurrentUser() user: User,
  ) {
    return this.aiService.submit({
      userId: user.id,
      kind: 'event-summary',
      targetType: 'event',
      targetId: eventId,
      promptInput: { kind: 'text', text: dto.text ?? '' },
    });
  }

  /** 轮询 job 状态 */
  @Get('jobs/:id')
  async getJob(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiService.getJob(id, user.id);
  }

  @Get('jobs')
  async listJobs(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.aiService.listJobs(user.id, limit ? parseInt(limit, 10) : 20);
  }
}