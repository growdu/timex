import { Test, TestingModule } from '@nestjs/testing';
import { MemoirsController, PublicMemoirsController } from './memoirs.controller';
import { MemoirsService } from './memoirs.service';
import { MemoirStatus } from './memoir-status.enum';

describe('MemoirsController', () => {
  let controller: MemoirsController;
  let publicController: PublicMemoirsController;
  let memoirsService: jest.Mocked<MemoirsService>;

  const mockUser = { id: 'user-1' } as any;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getShareToken: jest.fn(),
      addChapter: jest.fn(),
      updateChapter: jest.fn(),
      deleteChapter: jest.fn(),
      getByShareToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoirsController, PublicMemoirsController],
      providers: [{ provide: MemoirsService, useValue: mockService }],
    }).compile();

    controller = module.get<MemoirsController>(MemoirsController);
    publicController = module.get<PublicMemoirsController>(PublicMemoirsController);
    memoirsService = module.get(MemoirsService);
  });

  describe('findAll', () => {
    it('forwards status and pagination', async () => {
      memoirsService.findAll.mockResolvedValue({ memoirs: [], total: 0 });

      await controller.findAll(mockUser, MemoirStatus.DRAFT, 1, 20);

      expect(memoirsService.findAll).toHaveBeenCalledWith('user-1', {
        status: MemoirStatus.DRAFT,
        page: 1,
        limit: 20,
      });
    });

    it('handles undefined params', async () => {
      memoirsService.findAll.mockResolvedValue({ memoirs: [], total: 0 });

      await controller.findAll(mockUser, undefined, undefined, undefined);

      expect(memoirsService.findAll).toHaveBeenCalledWith('user-1', {
        status: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('forwards', async () => {
      memoirsService.findOne.mockResolvedValue({} as any);

      await controller.findOne(mockUser, 'mem-1');

      expect(memoirsService.findOne).toHaveBeenCalledWith('user-1', 'mem-1');
    });
  });

  describe('create', () => {
    it('forwards dto', async () => {
      const dto: any = { title: 'My Memoir', blurb: 'A short blurb' };
      memoirsService.create.mockResolvedValue({} as any);

      await controller.create(mockUser, dto);

      expect(memoirsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('update', () => {
    it('forwards id and dto', async () => {
      memoirsService.update.mockResolvedValue({} as any);

      await controller.update(mockUser, 'mem-1', { title: 'X' } as any);

      expect(memoirsService.update).toHaveBeenCalledWith('user-1', 'mem-1', {
        title: 'X',
      });
    });
  });

  describe('delete', () => {
    it('forwards id', async () => {
      memoirsService.delete.mockResolvedValue(undefined);

      await controller.delete(mockUser, 'mem-1');

      expect(memoirsService.delete).toHaveBeenCalledWith('user-1', 'mem-1');
    });
  });

  describe('getShareToken', () => {
    it('wraps shareToken in object', async () => {
      memoirsService.getShareToken.mockResolvedValue('share-abc');

      const result = await controller.getShareToken(mockUser, 'mem-1');

      expect(memoirsService.getShareToken).toHaveBeenCalledWith('user-1', 'mem-1');
      expect(result).toEqual({ shareToken: 'share-abc' });
    });
  });

  describe('chapters', () => {
    it('addChapter → forwards', async () => {
      const dto: any = { title: 'Ch1', content: '...', sortOrder: 1 };
      memoirsService.addChapter.mockResolvedValue({} as any);

      await controller.addChapter(mockUser, 'mem-1', dto);

      expect(memoirsService.addChapter).toHaveBeenCalledWith('user-1', 'mem-1', dto);
    });

    it('updateChapter → forwards', async () => {
      memoirsService.updateChapter.mockResolvedValue({} as any);

      await controller.updateChapter(
        mockUser,
        'mem-1',
        'ch-1',
        { title: 'Updated' } as any,
      );

      expect(memoirsService.updateChapter).toHaveBeenCalledWith(
        'user-1',
        'mem-1',
        'ch-1',
        { title: 'Updated' },
      );
    });

    it('deleteChapter → forwards', async () => {
      memoirsService.deleteChapter.mockResolvedValue(undefined);

      await controller.deleteChapter(mockUser, 'mem-1', 'ch-1');

      expect(memoirsService.deleteChapter).toHaveBeenCalledWith(
        'user-1',
        'mem-1',
        'ch-1',
      );
    });
  });
});

describe('PublicMemoirsController', () => {
  let publicController: PublicMemoirsController;
  let memoirsService: jest.Mocked<MemoirsService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getShareToken: jest.fn(),
      addChapter: jest.fn(),
      updateChapter: jest.fn(),
      deleteChapter: jest.fn(),
      getByShareToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoirsController, PublicMemoirsController],
      providers: [{ provide: MemoirsService, useValue: mockService }],
    }).compile();

    publicController = module.get<PublicMemoirsController>(PublicMemoirsController);
    memoirsService = module.get(MemoirsService);
  });

  it('getByShareToken → forwards token (no auth)', async () => {
    memoirsService.getByShareToken.mockResolvedValue({} as any);

    await publicController.getByShareToken('share-abc');

    expect(memoirsService.getByShareToken).toHaveBeenCalledWith('share-abc');
  });
});