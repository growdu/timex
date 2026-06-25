import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LicenseService } from './license.service';
import { License } from './license.entity';
import { PlanType, LicenseStatus } from './license.enums';
import { Device } from '../devices/device.entity';

describe('LicenseService', () => {
  let service: LicenseService;
  let licensesRepository: jest.Mocked<any>;
  let devicesRepository: jest.Mocked<any>;
  let jwtService: jest.Mocked<JwtService>;

  const mockLicense: Partial<License> = {
    id: 'license-1',
    userId: 'user-1',
    licenseKey: 'TIMEX-LIFE-XXXX',
    planType: PlanType.LIFETIME,
    status: LicenseStatus.ACTIVE,
    deviceLimit: 5,
    expiresAt: null,
    createdAt: new Date(),
  };

  const mockDevice: Partial<Device> = {
    id: 'device-1',
    userId: 'user-1',
    licenseId: 'license-1',
    deviceName: 'Test Device',
    deviceFingerprint: 'abc123',
    lastActiveAt: new Date(),
  };

  beforeEach(async () => {
    const mockLicensesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDevicesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-license-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseService,
        {
          provide: getRepositoryToken(License),
          useValue: mockLicensesRepo,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDevicesRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<LicenseService>(LicenseService);
    licensesRepository = module.get(getRepositoryToken(License));
    devicesRepository = module.get(getRepositoryToken(Device));
    jwtService = module.get(JwtService);
  });

  describe('activateLicense', () => {
    const activateDto = {
      licenseKey: 'TIMEX-LIFE-XXXX',
      deviceName: 'Test Device',
      deviceFingerprint: 'abc123',
    };

    it('should successfully activate a license', async () => {
      licensesRepository.findOne.mockResolvedValue(mockLicense);
      devicesRepository.count.mockResolvedValue(0);
      devicesRepository.create.mockReturnValue(mockDevice);
      devicesRepository.save.mockResolvedValue(mockDevice);

      const result = await service.activateLicense('user-1', activateDto);

      expect(result).toHaveProperty('licenseToken');
      expect(result).toHaveProperty('license');
      expect(result).toHaveProperty('device');
    });

    it('should throw NotFoundException if license key not found', async () => {
      licensesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.activateLicense('user-1', activateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if license does not belong to user', async () => {
      licensesRepository.findOne.mockResolvedValue({
        ...mockLicense,
        userId: 'other-user',
      });

      await expect(
        service.activateLicense('user-1', activateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if license is not active', async () => {
      licensesRepository.findOne.mockResolvedValue({
        ...mockLicense,
        status: LicenseStatus.EXPIRED,
      });

      await expect(
        service.activateLicense('user-1', activateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if device limit is reached', async () => {
      licensesRepository.findOne.mockResolvedValue(mockLicense);
      devicesRepository.count.mockResolvedValue(mockLicense.deviceLimit);

      await expect(
        service.activateLicense('user-1', activateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLicenseStatus', () => {
    it('should return license status with active license', async () => {
      licensesRepository.find.mockResolvedValue([mockLicense]);
      devicesRepository.find.mockResolvedValue([mockDevice]);

      const result = await service.getLicenseStatus('user-1');

      expect(result).toHaveProperty('activeLicense');
      expect(result).toHaveProperty('devices');
      expect(result.isInTrial).toBe(false);
    });

    it('should return null for activeLicense if no valid license found', async () => {
      licensesRepository.find.mockResolvedValue([]);

      const result = await service.getLicenseStatus('user-1');

      expect(result.activeLicense).toBeNull();
      expect(result.devices).toEqual([]);
    });
  });

  describe('deactivateDevice', () => {
    it('should successfully deactivate a device', async () => {
      devicesRepository.findOne.mockResolvedValue(mockDevice);
      devicesRepository.remove.mockResolvedValue(mockDevice);

      await expect(
        service.deactivateDevice('user-1', 'device-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if device not found', async () => {
      devicesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deactivateDevice('user-1', 'device-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDevices', () => {
    it('should return all devices for user', async () => {
      devicesRepository.find.mockResolvedValue([mockDevice]);

      const result = await service.getDevices('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].deviceName).toBe(mockDevice.deviceName);
    });
  });

  describe('verifyLicenseToken', () => {
    it('should verify a valid license token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        type: 'license',
        licenseId: 'license-1',
        planType: PlanType.LIFETIME,
      });
      licensesRepository.findOne.mockResolvedValue(mockLicense);

      const result = await service.verifyLicenseToken('valid-token');

      expect(result).toHaveProperty('licenseId');
    });

    it('should throw BadRequestException for invalid token type', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        type: 'access',
      });

      await expect(service.verifyLicenseToken('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if license is not active', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@example.com',
        type: 'license',
        licenseId: 'license-1',
        planType: PlanType.LIFETIME,
      });
      licensesRepository.findOne.mockResolvedValue({
        ...mockLicense,
        status: LicenseStatus.EXPIRED,
      });

      await expect(service.verifyLicenseToken('valid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateLicenseKey', () => {
    it('should generate a license key for lifetime plan', async () => {
      licensesRepository.save.mockResolvedValue({
        ...mockLicense,
        licenseKey: 'TIMEX-LIFE-XXXX',
      });

      const result = await service.generateLicenseKey(
        'user-1',
        PlanType.LIFETIME,
      );

      expect(result).toContain('TIMEX-LIFE');
      expect(licensesRepository.save).toHaveBeenCalled();
    });

    it('should generate a license key for annual plan', async () => {
      licensesRepository.save.mockResolvedValue({
        ...mockLicense,
        licenseKey: 'TIMEX-ANNUAL-YYYY',
      });

      const result = await service.generateLicenseKey(
        'user-1',
        PlanType.ANNUAL,
      );

      expect(result).toContain('TIMEX-ANNUAL');
    });

    it('should generate a license key for trial plan', async () => {
      licensesRepository.save.mockResolvedValue({
        ...mockLicense,
        licenseKey: 'TIMEX-TRIAL-ZZZZ',
      });

      const result = await service.generateLicenseKey('user-1', PlanType.TRIAL);

      expect(result).toContain('TIMEX-TRIAL');
    });
  });
});
