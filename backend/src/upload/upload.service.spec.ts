import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { s3Config } from './upload.config';

// Mock @aws-sdk/s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((_client, _cmd, opts) =>
      Promise.resolve(`https://signed.example.com/?X-Expires=${opts.expiresIn}`),
    ),
}));

describe('UploadService', () => {
  let service: UploadService;
  let s3: { send: jest.Mock };

  beforeEach(async () => {
    s3 = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: 'S3_CLIENT', useValue: s3 },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  // ----------------------------------------------------------------
  // presign()
  // ----------------------------------------------------------------
  describe('presign', () => {
    it('rejects unknown kind', async () => {
      await expect(
        service.presign('user-1', 'unknown' as any, 'image/jpeg', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects mismatched mimeType for kind=photo', async () => {
      await expect(
        service.presign('user-1', 'photo', 'application/pdf', 1000),
      ).rejects.toThrow(/photo requires/);
    });

    it('rejects mismatched mimeType for kind=video', async () => {
      await expect(
        service.presign('user-1', 'video', 'image/jpeg', 1000),
      ).rejects.toThrow(/video requires/);
    });

    it('rejects mismatched mimeType for kind=audio', async () => {
      await expect(
        service.presign('user-1', 'audio', 'video/mp4', 1000),
      ).rejects.toThrow(/audio requires/);
    });

    it('accepts all whitelisted photo mimes', async () => {
      for (const m of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']) {
        const r = await service.presign('user-1', 'photo', m, 1024);
        expect(r.key).toMatch(/^uploads\/user-1\/photo\//);
        expect(r.maxSize).toBe(20 * 1024 * 1024);
      }
    });

    it('rejects fileSize <= 0', async () => {
      await expect(
        service.presign('user-1', 'photo', 'image/jpeg', 0),
      ).rejects.toThrow(/fileSize must be in/);
    });

    it('rejects fileSize > maxSize', async () => {
      await expect(
        service.presign('user-1', 'photo', 'image/jpeg', 50 * 1024 * 1024),
      ).rejects.toThrow(/fileSize must be in/);
    });

    it('caps maxSize at global MAX_UPLOAD_SIZE', async () => {
      // Suppose global cap is 100 MB; video default 500 MB should be capped to 100 MB
      const r = await service.presign('user-1', 'video', 'video/mp4', 1024);
      expect(r.maxSize).toBe(s3Config.maxUploadSize);
    });

    it('returns presigned URL with key prefixed by uploads/{userId}/{kind}/', async () => {
      const r = await service.presign('user-42', 'photo', 'image/jpeg', 1024);
      expect(r.key).toMatch(/^uploads\/user-42\/photo\/\d+-[a-f0-9]{16}\.jpg$/);
      expect(r.url).toContain('https://signed.example.com');
      expect(new Date(r.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('uses PNG extension for image/png', async () => {
      const r = await service.presign('user-1', 'photo', 'image/png', 1024);
      expect(r.key).toMatch(/\.png$/);
    });
  });

  // ----------------------------------------------------------------
  // complete()
  // ----------------------------------------------------------------
  describe('complete', () => {
    const validKey = 'uploads/user-1/photo/123-abc.jpg';

    it('rejects key not owned by user (ForbiddenException)', async () => {
      await expect(
        service.complete('user-1', 'uploads/user-99/photo/123.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects key with no uploads/ prefix', async () => {
      await expect(
        service.complete('user-1', 'malicious/key.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequest when object not found in S3', async () => {
      s3.send.mockRejectedValueOnce({
        $metadata: { httpStatusCode: 404 },
        name: 'NotFound',
      });
      await expect(
        service.complete('user-1', validKey),
      ).rejects.toThrow(/object not found/);
    });

    it('rethrows non-404 errors from S3', async () => {
      const boom = new Error('network down');
      s3.send.mockRejectedValueOnce(boom);
      await expect(
        service.complete('user-1', validKey),
      ).rejects.toBe(boom);
    });

    it('returns url, fileSize, contentType from HeadObject', async () => {
      s3.send.mockResolvedValueOnce({
        ContentLength: 12345,
        ContentType: 'image/jpeg',
      });
      const r = await service.complete('user-1', validKey);
      expect(r.key).toBe(validKey);
      expect(r.fileSize).toBe(12345);
      expect(r.contentType).toBe('image/jpeg');
      expect(r.url).toBe(`${s3Config.publicUrl}/${validKey}`);
    });

    it('passes through optional width/height/duration', async () => {
      s3.send.mockResolvedValueOnce({ ContentLength: 1, ContentType: 'image/jpeg' });
      const r = await service.complete('user-1', validKey, {
        width: 800,
        height: 600,
        duration: 12.5,
      });
      expect(r.width).toBe(800);
      expect(r.height).toBe(600);
      expect(r.duration).toBe(12.5);
    });

    it('omits undefined optional meta fields', async () => {
      s3.send.mockResolvedValueOnce({ ContentLength: 1, ContentType: 'image/jpeg' });
      const r = await service.complete('user-1', validKey);
      expect(r).not.toHaveProperty('width');
      expect(r).not.toHaveProperty('height');
      expect(r).not.toHaveProperty('duration');
    });

    it('falls back to application/octet-stream when ContentType missing', async () => {
      s3.send.mockResolvedValueOnce({ ContentLength: 0, ContentType: undefined });
      const r = await service.complete('user-1', validKey);
      expect(r.contentType).toBe('application/octet-stream');
    });
  });

  // ----------------------------------------------------------------
  // remove()
  // ----------------------------------------------------------------
  describe('remove', () => {
    it('rejects key not owned by user', async () => {
      await expect(
        service.remove('user-1', 'uploads/user-2/photo/abc.jpg'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('calls S3 DeleteObjectCommand on valid key', async () => {
      s3.send.mockResolvedValueOnce({});
      await service.remove('user-1', 'uploads/user-1/photo/abc.jpg');
      expect(s3.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: s3Config.bucket,
            Key: 'uploads/user-1/photo/abc.jpg',
          }),
        }),
      );
    });
  });
});
