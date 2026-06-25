import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { License } from './license.entity';
import { PlanType, LicenseStatus } from './license.enums';
import { Device } from '../devices/device.entity';
import { ActivateLicenseDto } from './dto/license.dto';
import { LicenseTokenPayload } from '../common/interfaces/jwt-payload.interface';
import { jwtConfig } from '../config';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private licensesRepository: Repository<License>,
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private jwtService: JwtService,
  ) {}

  async activateLicense(
    userId: string,
    dto: ActivateLicenseDto,
  ): Promise<{
    licenseToken: string;
    license: Partial<License>;
    device: Partial<Device>;
  }> {
    const license = await this.licensesRepository.findOne({
      where: { licenseKey: dto.licenseKey },
    });

    if (!license) {
      throw new NotFoundException('License key not found');
    }

    if (license.userId !== userId) {
      throw new ForbiddenException('License key does not belong to this user');
    }

    if (license.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException('License is not active');
    }

    // Check if license is expired (for non-lifetime)
    if (license.planType !== PlanType.LIFETIME && license.expiresAt) {
      if (new Date(license.expiresAt) < new Date()) {
        throw new BadRequestException('License has expired');
      }
    }

    // Get current device count
    const currentDevices = await this.devicesRepository.count({
      where: { licenseId: license.id },
    });

    // Register new device
    const device = this.devicesRepository.create({
      userId,
      licenseId: license.id,
      deviceName: dto.deviceName || 'Unknown Device',
      deviceFingerprint: dto.deviceFingerprint || uuidv4(),
    });
    await this.devicesRepository.save(device);

    // Generate license token
    const licenseToken = this.generateLicenseToken(userId, license);

    return {
      licenseToken,
      license: {
        id: license.id,
        planType: license.planType,
        deviceLimit: license.deviceLimit,
        expiresAt: license.expiresAt,
      },
      device: {
        id: device.id,
        deviceName: device.deviceName,
        lastActiveAt: device.lastActiveAt,
      },
    };
  }

  async deactivateDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.devicesRepository.remove(device);
  }

  async getLicenseStatus(userId: string): Promise<{
    activeLicense: Partial<License> | null;
    devices: Partial<Device>[];
    isInTrial: boolean;
    trialExpiresAt: Date | null;
  }> {
    // Get user's active license (prefer lifetime, then annual, then trial)
    const licenses = await this.licensesRepository.find({
      where: { userId },
      order: {
        createdAt: 'ASC',
      },
    });

    let activeLicense: License | null = null;
    for (const license of licenses) {
      if (license.status === LicenseStatus.ACTIVE) {
        if (license.planType === PlanType.LIFETIME) {
          activeLicense = license;
          break;
        }
        if (
          license.planType === PlanType.ANNUAL &&
          license.expiresAt &&
          new Date(license.expiresAt) > new Date()
        ) {
          activeLicense = license;
          break;
        }
        if (
          license.planType === PlanType.TRIAL &&
          license.expiresAt &&
          new Date(license.expiresAt) > new Date()
        ) {
          activeLicense = license;
          break;
        }
      }
    }

    const devices = activeLicense
      ? await this.devicesRepository.find({
          where: { licenseId: activeLicense.id },
        })
      : [];

    return {
      activeLicense: activeLicense
        ? {
            id: activeLicense.id,
            planType: activeLicense.planType,
            deviceLimit: activeLicense.deviceLimit,
            expiresAt: activeLicense.expiresAt,
            status: activeLicense.status,
          }
        : null,
      devices: devices.map((d) => ({
        id: d.id,
        deviceName: d.deviceName,
        lastActiveAt: d.lastActiveAt,
      })),
      isInTrial: activeLicense?.planType === PlanType.TRIAL,
      trialExpiresAt:
        activeLicense?.planType === PlanType.TRIAL
          ? activeLicense.expiresAt
          : null,
    };
  }

  async getDevices(userId: string): Promise<Partial<Device>[]> {
    const devices = await this.devicesRepository.find({
      where: { userId },
      relations: ['license'],
    });

    return devices.map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      lastActiveAt: d.lastActiveAt,
      licenseId: d.licenseId,
    }));
  }

  async updateDeviceActivity(deviceFingerprint: string): Promise<void> {
    const device = await this.devicesRepository.findOne({
      where: { deviceFingerprint },
    });

    if (device) {
      device.lastActiveAt = new Date();
      await this.devicesRepository.save(device);
    }
  }

  async verifyLicenseToken(licenseToken: string): Promise<LicenseTokenPayload> {
    try {
      const payload = this.jwtService.verify<LicenseTokenPayload>(
        licenseToken,
        {
          secret: jwtConfig.secret,
        },
      );

      if (payload.type !== 'license') {
        throw new BadRequestException('Invalid license token');
      }

      // Verify license is still active
      const license = await this.licensesRepository.findOne({
        where: { id: payload.licenseId },
      });

      if (!license || license.status !== LicenseStatus.ACTIVE) {
        throw new BadRequestException('License is not active');
      }

      if (
        license.planType !== PlanType.LIFETIME &&
        license.expiresAt &&
        new Date(license.expiresAt) < new Date()
      ) {
        throw new BadRequestException('License has expired');
      }

      return payload;
    } catch {
      throw new BadRequestException('Invalid license token');
    }
  }

  private generateLicenseToken(userId: string, license: License): string {
    const payload = {
      sub: userId,
      email: '',
      type: 'license',
      licenseId: license.id,
      planType: license.planType,
    };

    return this.jwtService.sign(payload);
  }

  // Generate a new license key (for admin/use in purchasing flow)
  async generateLicenseKey(
    userId: string,
    planType: PlanType,
  ): Promise<string> {
    const prefix =
      planType === PlanType.LIFETIME
        ? 'TIMEX-LIFE'
        : planType === PlanType.ANNUAL
          ? 'TIMEX-ANNUAL'
          : 'TIMEX-TRIAL';

    const licenseKey = `${prefix}-${uuidv4().toUpperCase().slice(0, 12)}`;

    const license = new License();
    license.userId = userId;
    license.licenseKey = licenseKey;
    license.planType = planType;
    license.status = LicenseStatus.ACTIVE;
    license.deviceLimit =
      planType === PlanType.LIFETIME ? 5 : planType === PlanType.ANNUAL ? 3 : 1;
    license.purchasedAt = planType !== PlanType.TRIAL ? new Date() : null;
    license.expiresAt =
      planType === PlanType.ANNUAL
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : planType === PlanType.TRIAL
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : null;

    await this.licensesRepository.save(license);

    return licenseKey;
  }
}
