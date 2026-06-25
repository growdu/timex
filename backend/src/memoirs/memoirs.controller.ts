import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MemoirsService } from './memoirs.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { MemoirStatus } from './memoir-status.enum';

@Controller('api/memoirs')
@UseGuards(AuthGuard('jwt'))
export class MemoirsController {
  constructor(private memoirsService: MemoirsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('status') status?: MemoirStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.memoirsService.findAll(user.id, { status, page, limit });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.memoirsService.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: { title: string; blurb?: string },
  ) {
    return this.memoirsService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<User>,
  ) {
    return this.memoirsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.memoirsService.delete(user.id, id);
  }

  @Post(':id/share')
  async getShareToken(@CurrentUser() user: User, @Param('id') id: string) {
    return { shareToken: await this.memoirsService.getShareToken(user.id, id) };
  }

  @Post(':id/chapters')
  async addChapter(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: { title: string; content?: string; sortOrder?: number },
  ) {
    return this.memoirsService.addChapter(user.id, id, dto);
  }

  @Put(':id/chapters/:chapterId')
  async updateChapter(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: Partial<User>,
  ) {
    return this.memoirsService.updateChapter(user.id, id, chapterId, dto);
  }

  @Delete(':id/chapters/:chapterId')
  async deleteChapter(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.memoirsService.deleteChapter(user.id, id, chapterId);
  }
}

@Controller('api/public/memoirs')
export class PublicMemoirsController {
  constructor(private memoirsService: MemoirsService) {}

  @Get('s/:shareToken')
  async getByShareToken(@Param('shareToken') shareToken: string) {
    return this.memoirsService.getByShareToken(shareToken);
  }
}
