import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../users/user.entity';
import { AddScratchDumpItemDto } from '../dto/add-scratch-dump-item.dto';
import { ScratchDumpService } from './scratch-dump.service';

/**
 * /faces/dumps — scratch dump 子模块 REST 入口。
 *
 * 路由（顺序敏感：:id 必须放后面避免被 /search 抢先匹配）：
 *   POST   /faces/dumps                  → 新建 dump
 *   GET    /faces/dumps                  → 列出本人 dump
 *   GET    /faces/dumps/:id              → 单个 dump 详情
 *   DELETE /faces/dumps/:id              → 删除 dump
 *   POST   /faces/dumps/:id/photos       → 加一张照片（异步 face-extract-scratch）
 *   GET    /faces/dumps/:id/items        → 列出 dump 内照片（按 status 过滤）
 *   GET    /faces/dumps/:id/status       → 进度统计
 *   POST   /faces/dumps/:id/search       → 检索命中（按本人 enabled face refs）
 */
@Controller('faces/dumps')
export class ScratchDumpController {
  constructor(private readonly svc: ScratchDumpService) {}

  @Post()
  create(
    @CurrentUser() u: User,
    @Body() body: { name: string; description?: string },
  ) {
    return this.svc.create(u.id, body);
  }

  @Get()
  list(@CurrentUser() u: User, @Query('limit') limit?: string) {
    return this.svc.list(u.id, limit ? Number(limit) : 50);
  }

  @Get(':id')
  one(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.getOne(u.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.remove(u.id, id);
  }

  @Post(':id/photos')
  addItem(
    @CurrentUser() u: User,
    @Param('id') id: string,
    @Body() body: AddScratchDumpItemDto,
  ) {
    return this.svc.addItem(u.id, id, body);
  }

  @Get(':id/items')
  items(
    @CurrentUser() u: User,
    @Param('id') id: string,
    @Query('status') status?: 'pending' | 'processed' | 'failed',
  ) {
    return this.svc.listItems(u.id, id, { status });
  }

  @Get(':id/status')
  status(@CurrentUser() u: User, @Param('id') id: string) {
    return this.svc.getStatus(u.id, id);
  }

  @Post(':id/search')
  search(
    @CurrentUser() u: User,
    @Param('id') id: string,
    @Body() body: { threshold?: number; topK?: number },
  ) {
    return this.svc.searchDump(u.id, id, body);
  }
}
