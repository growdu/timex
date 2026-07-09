import {
  Controller, Get, Put, Body, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { UpdateDashboardConfigDto } from './dto/dashboard.dto';

@Controller('api/dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    return this.dashboardService.getStats(user.id);
  }

  @Get('config')
  async getConfig(@CurrentUser() user: User) {
    return this.dashboardService.getConfig(user.id);
  }

  @Put('config')
  async updateConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateDashboardConfigDto,
  ) {
    return this.dashboardService.updateConfig(user.id, dto.widgets);
  }
}
