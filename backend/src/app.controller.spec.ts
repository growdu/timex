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
    it('returns status from service', () => {
      appService.getHealth.mockReturnValue({
        status: 'ok',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(controller.getHealth()).toEqual({
        status: 'ok',
        timestamp: '2024-01-01T00:00:00Z',
      });
      expect(appService.getHealth).toHaveBeenCalled();
    });
  });
});
