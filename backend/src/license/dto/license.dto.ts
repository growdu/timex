import { IsString, IsOptional } from 'class-validator';

export class ActivateLicenseDto {
  @IsString()
  licenseKey: string;

  @IsString()
  @IsOptional()
  deviceName?: string;

  @IsString()
  @IsOptional()
  deviceFingerprint?: string;
}

export class DeactivateDeviceDto {
  @IsString()
  deviceId: string;
}
