import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ActivateLicenseDto {
  @IsString()
  @MaxLength(100)
  licenseKey: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deviceName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deviceFingerprint?: string;
}

export class DeactivateDeviceDto {
  @IsString()
  @MaxLength(100)
  deviceId: string;
}
