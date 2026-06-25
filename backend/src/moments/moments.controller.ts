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
import { MomentsService } from './moments.service';
import { CreateMomentDto, UpdateMomentDto } from './dto/moment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { MomentType } from './moment.entity';

@Controller('api/moments')
@UseGuards(AuthGuard('jwt'))
export class MomentsController {
  constructor(private momentsService: MomentsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('type') type?: MomentType,
    @Query('eventId') eventId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.momentsService.findAll(user.id, { type, eventId, page, limit });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.momentsService.findOne(user.id, id);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateMomentDto) {
    return this.momentsService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateMomentDto,
  ) {
    return this.momentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.momentsService.delete(user.id, id);
  }
}
