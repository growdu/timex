import {
  Controller, Get, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExportService } from './export.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('api/export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('album')
  async exportAlbum(
    @CurrentUser() user: User,
    @Query('year') year?: number,
  ) {
    return this.exportService.exportAlbum(user.id, year);
  }

  @Get('storybook/:memoirId')
  async exportStorybook(
    @CurrentUser() user: User,
    @Param('memoirId') memoirId: string,
  ) {
    return this.exportService.exportStorybook(user.id, memoirId);
  }

  @Get('timeline')
  async exportTimeline(@CurrentUser() user: User) {
    return this.exportService.exportTimeline(user.id);
  }
}
