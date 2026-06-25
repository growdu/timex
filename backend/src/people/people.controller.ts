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
import { PeopleService } from './people.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('api/people')
@UseGuards(AuthGuard('jwt'))
export class PeopleController {
  constructor(private peopleService: PeopleService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.peopleService.findAll(user.id, { page, limit });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.peopleService.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    dto: { name: string; role?: string; intro?: string; avatarUrl?: string },
  ) {
    return this.peopleService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<User>,
  ) {
    return this.peopleService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.peopleService.delete(user.id, id);
  }
}
