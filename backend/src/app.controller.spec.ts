import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const mockService = {
      getHello: jest.fn(),
      getHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  describe('getHello', () => {
    it('returns greeting from service', () => {
      appService.getHello.mockReturnValue('Hello World!');

      expect(controller.getHello()).toBe('Hello World!');
      expect(appService.getHello).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('returns health report from service', async () => {
      const report = {
        status: 'ok' as const,
        timestamp: '2024-01-01T00:00:00Z',
        uptimeSec: 10,
        components: {
          api: { status: 'ok' as const, latencyMs: 0 },
          s3: { status: 'ok' as const, latencyMs: 5 },
        },
      };
      appService.getHealth.mockResolvedValue(report);

      await expect(controller.getHealth()).resolves.toEqual(report);
      expect(appService.getHealth).toHaveBeenCalled();
    });
  });
});
