import { Test, TestingModule } from '@nestjs/testing';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { AppService, HealthReport } from './app.service';
import { S3_CLIENT } from './upload/s3.client';

describe('AppService', () => {
  let service: AppService;
  let mockSend: jest.Mock;

  const buildModule = async (withS3: boolean) => {
    const providers: any[] = [AppService];
    if (withS3) {
      mockSend = jest.fn();
      providers.push({
        provide: S3_CLIENT,
        useValue: { send: mockSend },
      });
    }
    return Test.createTestingModule({ providers }).compile();
  };

  describe('getHello', () => {
    beforeEach(async () => {
      const module: TestingModule = await buildModule(false);
      service = module.get(AppService);
    });

    it('returns greeting', () => {
      expect(service.getHello()).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    describe('without S3 client', () => {
      beforeEach(async () => {
        const module: TestingModule = await buildModule(false);
        service = module.get(AppService);
      });

      it('reports status ok with api only', async () => {
        const report = await service.getHealth();
        expect(report.status).toBe('ok');
        expect(report.components.api.status).toBe('ok');
        expect(report.components.s3.status).toBe('disabled');
        expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(report.uptimeSec).toBeGreaterThanOrEqual(0);
      });
    });

    describe('with S3 client', () => {
      let module: TestingModule;

      beforeEach(async () => {
        module = await buildModule(true);
        service = module.get(AppService);
      });

      it('reports s3 ok when HeadBucket succeeds', async () => {
        mockSend.mockResolvedValueOnce({});
        const report = await service.getHealth();
        expect(report.status).toBe('ok');
        expect(report.components.s3.status).toBe('ok');
        expect(report.components.s3.latencyMs).toBeGreaterThanOrEqual(0);
        expect(mockSend).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
      });

      it('reports s3 error when HeadBucket throws (network)', async () => {
        mockSend.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const report = await service.getHealth();
        expect(report.status).toBe('degraded');
        expect(report.components.s3.status).toBe('error');
        expect(report.components.s3.error).toBe('ECONNREFUSED');
      });

      it('reports s3 error when bucket missing (404)', async () => {
        const err = Object.assign(new Error('NotFound'), {
          $metadata: { httpStatusCode: 404 },
          name: 'NoSuchBucket',
        });
        mockSend.mockRejectedValueOnce(err);
        const report = await service.getHealth();
        expect(report.status).toBe('degraded');
        expect(report.components.s3.status).toBe('error');
        expect(report.components.s3.error).toBe('bucket not found');
      });
    });

    it('produces a HealthReport shape', async () => {
      const module: TestingModule = await buildModule(false);
      service = module.get(AppService);
      const report: HealthReport = await service.getHealth();
      expect(report).toMatchObject({
        status: expect.stringMatching(/^(ok|degraded)$/),
        timestamp: expect.any(String),
        uptimeSec: expect.any(Number),
        components: {
          api: expect.objectContaining({ status: expect.any(String) }),
          s3: expect.objectContaining({ status: expect.any(String) }),
        },
      });
    });
  });
});
