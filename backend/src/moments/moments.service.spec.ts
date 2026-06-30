import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MomentsService } from './moments.service';
import { Moment, MomentType } from './moment.entity';

describe('MomentsService', () => {
  let service: MomentsService;
  let momentsRepository: jest.Mocked<any>;
  let queryBuilder: any;

  const mockMoment: Partial<Moment> = {
    id: 'moment-1',
    userId: 'user-1',
    eventId: 'event-1',
    type: MomentType.PHOTO,
    mediaUrl: 'https://example.com/m.jpg',
    takenAt: new Date('2024-01-15T00:00:00Z'),
    createdAt: new Date(),
  };

  const buildQueryBuilder = (result: [any[], number]) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue(result),
    };
    return qb;
  };

  beforeEach(async () => {
    queryBuilder = buildQueryBuilder([[mockMoment], 1]);

    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomentsService,
        {
          provide: getRepositoryToken(Moment),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<MomentsService>(MomentsService);
    momentsRepository = module.get(getRepositoryToken(Moment));
  });

  describe('findByEvent', () => {
    it('should return moments for a specific event', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockMoment], 1]);

      const result = await service.findByEvent('user-1', 'event-1', {
        page: 1,
        limit: 50,
      });

      expect(result.moments).toEqual([mockMoment]);
      expect(result.total).toBe(1);
      expect(momentsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'moment',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'moment.userId = :userId',
        { userId: 'user-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'moment.eventId = :eventId',
        { eventId: 'event-1' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'moment.takenAt',
        'ASC',
      );
    });

    it('should filter by type when provided', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByEvent('user-1', 'event-1', {
        type: MomentType.VIDEO,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'moment.type = :type',
        { type: 'video' },
      );
    });

    it('should use default pagination (page=1, limit=50)', async () => {
      await service.findByEvent('user-1', 'event-1');

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(50);
    });

    it('should apply custom pagination', async () => {
      await service.findByEvent('user-1', 'event-1', { page: 2, limit: 10 });

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('findAll', () => {
    it('should return all moments with event joined', async () => {
      const momentWithEvent = { ...mockMoment, event: { id: 'event-1' } };
      queryBuilder.getManyAndCount.mockResolvedValue([[momentWithEvent], 1]);

      const result = await service.findAll('user-1');

      expect(result.moments).toEqual([momentWithEvent]);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'moment.event',
        'event',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'moment.takenAt',
        'DESC',
      );
    });

    it('should filter by type', async () => {
      await service.findAll('user-1', { type: MomentType.PHOTO });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'moment.type = :type',
        { type: 'photo' },
      );
    });

    it('should filter by eventId', async () => {
      await service.findAll('user-1', { eventId: 'event-1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'moment.eventId = :eventId',
        { eventId: 'event-1' },
      );
    });

    it('should apply pagination', async () => {
      await service.findAll('user-1', { page: 2, limit: 25 });

      expect(queryBuilder.skip).toHaveBeenCalledWith(25);
      expect(queryBuilder.take).toHaveBeenCalledWith(25);
    });
  });

  describe('findOne', () => {
    it('should return a moment with event relation', async () => {
      const momentWithEvent = { ...mockMoment, event: { id: 'event-1' } };
      momentsRepository.findOne.mockResolvedValue(momentWithEvent);

      const result = await service.findOne('user-1', 'moment-1');

      expect(result).toEqual(momentWithEvent);
      expect(momentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'moment-1', userId: 'user-1' },
        relations: ['event'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      momentsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a moment with explicit takenAt', async () => {
      const dto = {
        eventId: 'event-1',
        type: MomentType.PHOTO,
        mediaUrl: 'https://x.com/m.jpg',
        takenAt: '2024-01-15T12:00:00Z',
      };
      const createdMoment = { ...mockMoment, ...dto };
      momentsRepository.create.mockReturnValue(createdMoment);
      momentsRepository.save.mockResolvedValue(createdMoment);
      momentsRepository.findOne.mockResolvedValue(createdMoment);

      await service.create('user-1', dto);

      expect(momentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          eventId: 'event-1',
          type: MomentType.PHOTO,
          mediaUrl: 'https://x.com/m.jpg',
        }),
      );
      const createdArg = momentsRepository.create.mock.calls[0][0];
      expect(createdArg.takenAt).toBeInstanceOf(Date);
    });

    it('should default takenAt to now when not provided', async () => {
      const dto = { eventId: 'event-1', type: MomentType.PHOTO, mediaUrl: 'x' };
      const createdMoment = { ...mockMoment, ...dto };
      momentsRepository.create.mockReturnValue(createdMoment);
      momentsRepository.save.mockResolvedValue(createdMoment);
      momentsRepository.findOne.mockResolvedValue(createdMoment);

      const before = new Date();
      await service.create('user-1', dto);
      const after = new Date();

      const createdArg = momentsRepository.create.mock.calls[0][0];
      expect(createdArg.takenAt).toBeInstanceOf(Date);
      expect(createdArg.takenAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000,
      );
      expect(createdArg.takenAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000,
      );
    });

    it('should return the moment via findOne after save', async () => {
      const dto = { eventId: 'event-1', type: MomentType.PHOTO, mediaUrl: 'x' };
      const created = { ...mockMoment, ...dto, id: 'moment-2' };
      momentsRepository.create.mockReturnValue(created);
      momentsRepository.save.mockResolvedValue(created);
      momentsRepository.findOne.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(momentsRepository.findOne).toHaveBeenCalled();
      expect(result.id).toBe('moment-2');
    });
  });

  describe('update', () => {
    it('should update a moment with provided fields', async () => {
      const dto: any = { content: 'New content', title: 'New title' };
      const updated = { ...mockMoment, ...dto };
      momentsRepository.findOne
        .mockResolvedValueOnce(mockMoment)
        .mockResolvedValueOnce(updated);
      momentsRepository.save.mockResolvedValue(updated);

      const result = await service.update('user-1', 'moment-1', dto);

      expect(momentsRepository.save).toHaveBeenCalled();
      expect(result.content).toBe('New content');
    });

    it('should throw NotFoundException if moment not found', async () => {
      momentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { content: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should remove the moment', async () => {
      momentsRepository.findOne.mockResolvedValue(mockMoment);
      momentsRepository.remove.mockResolvedValue(mockMoment);

      await service.delete('user-1', 'moment-1');

      expect(momentsRepository.remove).toHaveBeenCalledWith(mockMoment);
    });

    it('should throw NotFoundException if moment not found', async () => {
      momentsRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
