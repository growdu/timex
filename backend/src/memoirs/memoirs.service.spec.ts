import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MemoirsService } from './memoirs.service';
import { Memoir } from './memoir.entity';
import { MemoirStatus } from './memoir-status.enum';
import { MemoirChapter } from './memoir-chapter.entity';

describe('MemoirsService', () => {
  let service: MemoirsService;
  let memoirsRepository: jest.Mocked<any>;
  let chaptersRepository: jest.Mocked<any>;
  let queryBuilderMock: any;

  const mockMemoir: Partial<Memoir> = {
    id: 'memoir-1',
    userId: 'user-1',
    title: 'Test Memoir',
    blurb: 'A test memoir',
    status: MemoirStatus.DRAFT,
    isPublic: false,
    shareToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChapter: Partial<MemoirChapter> = {
    id: 'chapter-1',
    memoirId: 'memoir-1',
    title: 'Chapter 1',
    content: 'Chapter content',
    sortOrder: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const mockMemoirsRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
    };

    const mockChaptersRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoirsService,
        {
          provide: getRepositoryToken(Memoir),
          useValue: mockMemoirsRepo,
        },
        {
          provide: getRepositoryToken(MemoirChapter),
          useValue: mockChaptersRepo,
        },
      ],
    }).compile();

    service = module.get<MemoirsService>(MemoirsService);
    memoirsRepository = module.get(getRepositoryToken(Memoir));
    chaptersRepository = module.get(getRepositoryToken(MemoirChapter));
  });

  describe('findAll', () => {
    it('should return paginated memoirs', async () => {
      const memoirs = [mockMemoir];
      queryBuilderMock.getManyAndCount.mockResolvedValue([memoirs, 1]);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.memoirs).toEqual(memoirs);
      expect(result.total).toBe(1);
    });

    it('should filter memoirs by status', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1', { status: MemoirStatus.PUBLISHED });

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a memoir by id with sorted chapters', async () => {
      const memoirWithChapters = {
        ...mockMemoir,
        chapters: [
          { ...mockChapter, sortOrder: 1 },
          { ...mockChapter, id: 'chapter-2', sortOrder: 0 },
        ],
      };
      memoirsRepository.findOne.mockResolvedValue(memoirWithChapters);

      const result = await service.findOne('user-1', 'memoir-1');

      expect(result).toBeDefined();
      expect(result.chapters[0].sortOrder).toBe(0);
    });

    it('should throw NotFoundException if memoir not found', async () => {
      memoirsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'memoir-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new memoir', async () => {
      const createDto = { title: 'New Memoir', blurb: 'A new memoir' };
      memoirsRepository.create.mockReturnValue(mockMemoir);
      memoirsRepository.save.mockResolvedValue(mockMemoir);
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });

      await service.create('user-1', createDto);

      expect(memoirsRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...createDto,
      });
      expect(memoirsRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing memoir', async () => {
      const updateDto = {
        title: 'Updated Title',
        status: MemoirStatus.PUBLISHED,
      };
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });
      memoirsRepository.save.mockResolvedValue({ ...mockMemoir, ...updateDto });

      await service.update('user-1', 'memoir-1', updateDto);

      expect(memoirsRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a memoir', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });
      memoirsRepository.remove.mockResolvedValue(mockMemoir);

      await service.delete('user-1', 'memoir-1');

      expect(memoirsRepository.remove).toHaveBeenCalledWith({
        ...mockMemoir,
        chapters: [],
      });
    });

    it('should throw NotFoundException if memoir not found', async () => {
      memoirsRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'memoir-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getShareToken', () => {
    it('should return existing share token', async () => {
      const memoirWithToken = {
        ...mockMemoir,
        shareToken: 'existing-token',
        chapters: [],
      };
      memoirsRepository.findOne.mockResolvedValue(memoirWithToken);

      const result = await service.getShareToken('user-1', 'memoir-1');

      expect(result).toBe('existing-token');
    });

    it('should generate and save new share token if not exists', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });
      memoirsRepository.save.mockResolvedValue({
        ...mockMemoir,
        shareToken: 'new-token',
      });

      const result = await service.getShareToken('user-1', 'memoir-1');

      expect(memoirsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getByShareToken', () => {
    it('should return memoir by share token if public', async () => {
      const publicMemoir = {
        ...mockMemoir,
        shareToken: 'share-token',
        isPublic: true,
        chapters: [],
      };
      memoirsRepository.findOne.mockResolvedValue(publicMemoir);

      const result = await service.getByShareToken('share-token');

      expect(result.shareToken).toBe('share-token');
    });

    it('should throw NotFoundException if memoir not found', async () => {
      memoirsRepository.findOne.mockResolvedValue(null);

      await expect(service.getByShareToken('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if memoir is not public', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        isPublic: false,
      });

      await expect(service.getByShareToken('share-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addChapter', () => {
    it('should add a new chapter to memoir', async () => {
      const memoirWithChapters = { ...mockMemoir, chapters: [mockChapter] };
      memoirsRepository.findOne.mockResolvedValue(memoirWithChapters);
      chaptersRepository.create.mockReturnValue(mockChapter);
      chaptersRepository.save.mockResolvedValue(mockChapter);

      await service.addChapter('user-1', 'memoir-1', {
        title: 'New Chapter',
        content: 'Chapter content',
      });

      expect(chaptersRepository.create).toHaveBeenCalled();
      expect(chaptersRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateChapter', () => {
    it('should update an existing chapter', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [mockChapter],
      });
      chaptersRepository.findOne.mockResolvedValue(mockChapter);
      chaptersRepository.save.mockResolvedValue({
        ...mockChapter,
        title: 'Updated Title',
      });

      await service.updateChapter('user-1', 'memoir-1', 'chapter-1', {
        title: 'Updated Title',
      });

      expect(chaptersRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if chapter not found', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });
      chaptersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateChapter('user-1', 'memoir-1', 'chapter-1', {
          title: 'New Title',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteChapter', () => {
    it('should delete a chapter', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [mockChapter],
      });
      chaptersRepository.findOne.mockResolvedValue(mockChapter);
      chaptersRepository.remove.mockResolvedValue(mockChapter);

      await service.deleteChapter('user-1', 'memoir-1', 'chapter-1');

      expect(chaptersRepository.remove).toHaveBeenCalledWith(mockChapter);
    });

    it('should throw NotFoundException if chapter not found', async () => {
      memoirsRepository.findOne.mockResolvedValue({
        ...mockMemoir,
        chapters: [],
      });
      chaptersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteChapter('user-1', 'memoir-1', 'chapter-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
