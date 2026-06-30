import { Test, TestingModule } from '@nestjs/testing';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';

describe('LicenseController', () => {
  let controller: LicenseController;
  let licenseService: jest.Mocked<LicenseService>;

  const mockUser = { id: 'user-1' } as any;

  beforeEach(async () => {
    const mockService = {
      activateLicense: jest.fn(),
      getLicenseStatus: jest.fn(),
      getDevices: jest.fn(),
      deactivateDevice: jest.fn(),
      verifyLicenseToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenseController],
      providers: [{ provide: LicenseService, useValue: mockService }],
    }).compile();

    controller = module.get<LicenseController>(LicenseController);
    licenseService = module.get(LicenseService);
  });

  it('activate → forwards userId and dto', async () => {
    const dto: any = { licenseKey: 'XXXX-XXXX-XXXX', deviceId: 'dev-1' };
    licenseService.activateLicense.mockResolvedValue({ ok: true } as any);

    await controller.activate(mockUser, dto);

    expect(licenseService.activateLicense).toHaveBeenCalledWith('user-1', dto);
  });

  it('getStatus → forwards userId', async () => {
    licenseService.getLicenseStatus.mockResolvedValue({ active: true } as any);

    await controller.getStatus(mockUser);

    expect(licenseService.getLicenseStatus).toHaveBeenCalledWith('user-1');
  });

  it('getDevices → forwards userId', async () => {
    licenseService.getDevices.mockResolvedValue({ devices: [] } as any);

    await controller.getDevices(mockUser);

    expect(licenseService.getDevices).toHaveBeenCalledWith('user-1');
  });

  it('deactivateDevice → forwards userId and deviceId', async () => {
    licenseService.deactivateDevice.mockResolvedValue(undefined);

    await controller.deactivateDevice(mockUser, 'dev-1');

    expect(licenseService.deactivateDevice).toHaveBeenCalledWith(
      'user-1',
      'dev-1',
    );
  });

  it('verifyLicenseToken → forwards token', async () => {
    licenseService.verifyLicenseToken.mockResolvedValue({ valid: true } as any);

    await controller.verifyLicenseToken('token-abc');

    expect(licenseService.verifyLicenseToken).toHaveBeenCalledWith('token-abc');
  });
});
