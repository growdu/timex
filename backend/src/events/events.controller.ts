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
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { EventStage } from './event-stage.enum';

@Controller('api/events')
@UseGuards(AuthGuard('jwt'))
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('year') year?: number,
    @Query('stage') stage?: EventStage,
    @Query('keyword') keyword?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findAll(user.id, {
      year,
      stage,
      keyword,
      page,
      limit,
    });
  }

  @Get('timeline')
  async getTimeline(
    @CurrentUser() user: User,
    @Query('startYear') startYear?: number,
    @Query('endYear') endYear?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.getTimeline(user.id, {
      startYear,
      endYear,
      page,
      limit,
    });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.findOne(user.id, id);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.eventsService.delete(user.id, id);
  }
}
