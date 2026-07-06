import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { User } from '../users/user.entity';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: {
    presign: jest.Mock;
    complete: jest.Mock;
    remove: jest.Mock;
  };

  const mockUser: Partial<User> = { id: 'user-1' };

  beforeEach(async () => {
    uploadService = {
      presign: jest.fn(),
      complete: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: uploadService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadController>(UploadController);
  });

  describe('sign', () => {
    it('delegates to uploadService.presign with user.id', async () => {
      uploadService.presign.mockResolvedValueOnce({
        key: 'uploads/user-1/photo/x.jpg',
        url: 'https://signed',
        expiresAt: '2026-06-30T07:00:00.000Z',
        maxSize: 20971520,
      });
      const result = await controller.sign(mockUser as User, {
        kind: 'photo',
        mimeType: 'image/jpeg',
        fileSize: 1234,
      });
      expect(uploadService.presign).toHaveBeenCalledWith(
        'user-1',
        'photo',
        'image/jpeg',
        1234,
      );
      expect(result.key).toContain('uploads/user-1/photo/');
    });
  });

  describe('complete', () => {
    it('rejects when key missing', async () => {
      await expect(
        controller.complete(mockUser as User, { key: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('forwards key and meta to uploadService.complete', async () => {
      uploadService.complete.mockResolvedValueOnce({
        key: 'uploads/user-1/photo/x.jpg',
        url: 'https://public',
        fileSize: 100,
        contentType: 'image/jpeg',
      });
      const r = await controller.complete(mockUser as User, {
        key: 'uploads/user-1/photo/x.jpg',
        width: 800,
        height: 600,
        duration: 5,
      });
      expect(uploadService.complete).toHaveBeenCalledWith(
        'user-1',
        'uploads/user-1/photo/x.jpg',
        { width: 800, height: 600, duration: 5 },
      );
      expect(r.key).toContain('uploads/user-1/');
    });

    it('omits undefined meta fields', async () => {
      uploadService.complete.mockResolvedValueOnce({
        key: 'k',
        url: 'u',
        fileSize: 1,
        contentType: 't',
      });
      await controller.complete(mockUser as User, {
        key: 'uploads/user-1/photo/x.jpg',
      });
      expect(uploadService.complete).toHaveBeenCalledWith(
        'user-1',
        'uploads/user-1/photo/x.jpg',
        { width: undefined, height: undefined, duration: undefined },
      );
    });
  });

  describe('remove', () => {
    it('passes full key when it has slashes', async () => {
      uploadService.remove.mockResolvedValueOnce(undefined);
      await controller.remove(
        mockUser as User,
        'uploads/user-1/photo/123-abc.jpg',
      );
      expect(uploadService.remove).toHaveBeenCalledWith(
        'user-1',
        'uploads/user-1/photo/123-abc.jpg',
      );
    });

    it('synthesizes key from user.id when param has no slash', async () => {
      uploadService.remove.mockResolvedValueOnce(undefined);
      await controller.remove(mockUser as User, '123-abc.jpg');
      expect(uploadService.remove).toHaveBeenCalledWith(
        'user-1',
        'uploads/user-1/photo/123-abc.jpg',
      );
    });
  });
});
