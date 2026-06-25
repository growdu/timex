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
import { PlacesService } from './places.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('api/places')
@UseGuards(AuthGuard('jwt'))
export class PlacesController {
  constructor(private placesService: PlacesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.placesService.findAll(user.id, { page, limit });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.placesService.findOne(user.id, id);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: Partial<User>) {
    return this.placesService.create(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: Partial<User>,
  ) {
    return this.placesService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.placesService.delete(user.id, id);
  }
}
