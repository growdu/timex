import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LicenseService } from './license.service';
import { ActivateLicenseDto, DeactivateDeviceDto } from './dto/license.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('api/license')
@UseGuards(AuthGuard('jwt'))
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  @Post('activate')
  async activate(@CurrentUser() user: User, @Body() dto: ActivateLicenseDto) {
    return this.licenseService.activateLicense(user.id, dto);
  }

  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    return this.licenseService.getLicenseStatus(user.id);
  }

  @Get('devices')
  async getDevices(@CurrentUser() user: User) {
    return this.licenseService.getDevices(user.id);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateDevice(
    @CurrentUser() user: User,
    @Param('id') deviceId: string,
  ) {
    return this.licenseService.deactivateDevice(user.id, deviceId);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyLicenseToken(@Body('licenseToken') licenseToken: string) {
    return this.licenseService.verifyLicenseToken(licenseToken);
  }
}
