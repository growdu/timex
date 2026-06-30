import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { EventStage } from './event-stage.enum';
import { Person } from '../people/person.entity';

const mockEvent: any = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Test Event',
  summary: 'A test event',
  date: '2024-06-15',
  stage: EventStage.STUDENT,
  placeId: 'place-1',
  createdAt: new Date(),
};

const mockPerson: any = {
  id: 'person-1',
  userId: 'user-1',
  name: 'Alice',
  role: 'Friend',
};

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<any>;
  let peopleRepository: jest.Mocked<any>;
  let queryBuilder: any;

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
    queryBuilder = buildQueryBuilder([[mockEvent], 1]);

    const mockEventsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const mockPeopleRepo = {
      findBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventsRepo,
        },
        {
          provide: getRepositoryToken(Person),
          useValue: mockPeopleRepo,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(getRepositoryToken(Event));
    peopleRepository = module.get(getRepositoryToken(Person));
  });

  describe('findAll', () => {
    it('should return paginated events with relations joined', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockEvent], 1]);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.events).toEqual([mockEvent]);
      expect(result.total).toBe(1);
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.place',
        'place',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.people',
        'people',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.moments',
        'moments',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'event.userId = :userId',
        { userId: 'user-1' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('event.date', 'DESC');
    });

    it('should filter by year when provided', async () => {
      await service.findAll('user-1', { year: 2024 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'EXTRACT(YEAR FROM event.date) = :year',
        { year: 2024 },
      );
    });

    it('should filter by stage when provided', async () => {
      await service.findAll('user-1', { stage: EventStage.STUDENT });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'event.stage = :stage',
        { stage: 'student' },
      );
    });

    it('should filter by keyword with ILIKE', async () => {
      await service.findAll('user-1', { keyword: 'wedding' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(event.title ILIKE :keyword OR event.summary ILIKE :keyword)',
        { keyword: '%wedding%' },
      );
    });

    it('should use default pagination (page=1, limit=20)', async () => {
      await service.findAll('user-1');

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should apply custom pagination', async () => {
      await service.findAll('user-1', { page: 3, limit: 10 });

      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should combine multiple filters', async () => {
      await service.findAll('user-1', {
        year: 2024,
        stage: EventStage.STUDENT,
        keyword: 'wedding',
      });

      // 三个 andWhere 至少调用 3 次（除了 userId 用的 where）
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('findOne', () => {
    it('should return event with all relations', async () => {
      eventsRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne('user-1', 'event-1');

      expect(result).toEqual(mockEvent);
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-1', userId: 'user-1' },
        relations: ['place', 'people', 'moments'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an event without people', async () => {
      const dto = {
        title: 'New Event',
        date: '2024-01-01',
        stage: EventStage.STUDENT,
      };
      const created = { ...mockEvent, ...dto };
      eventsRepository.create.mockReturnValue(created);
      eventsRepository.save.mockResolvedValue(created);
      eventsRepository.findOne.mockResolvedValue(created);

      await service.create('user-1', dto);

      expect(eventsRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...dto,
      });
      expect(eventsRepository.save).toHaveBeenCalled();
      // 没 personIds → 不应查 people
      expect(peopleRepository.findBy).not.toHaveBeenCalled();
    });

    it('should attach people when personIds provided', async () => {
      const dto = {
        title: 'New Event',
        date: '2024-01-01',
        stage: EventStage.STUDENT,
        personIds: ['person-1', 'person-2'],
      };
      const created = { ...mockEvent, ...dto };
      const people = [mockPerson, { ...mockPerson, id: 'person-2' }];
      eventsRepository.create.mockReturnValue(created);
      eventsRepository.save.mockResolvedValue(created);
      peopleRepository.findBy.mockResolvedValue(people);
      eventsRepository.findOne.mockResolvedValue({ ...created, people });

      await service.create('user-1', dto);

      expect(peopleRepository.findBy).toHaveBeenCalledWith({
        id: expect.anything(),
        userId: 'user-1',
      });
    });

    it('should skip people lookup when personIds is empty array', async () => {
      const dto = {
        title: 'New Event',
        date: '2024-01-01',
        stage: EventStage.STUDENT,
        personIds: [],
      };
      const created = { ...mockEvent, ...dto };
      eventsRepository.create.mockReturnValue(created);
      eventsRepository.save.mockResolvedValue(created);
      eventsRepository.findOne.mockResolvedValue(created);

      await service.create('user-1', dto);

      expect(peopleRepository.findBy).not.toHaveBeenCalled();
    });

    it('should return event via findOne after creation', async () => {
      const dto: any = { title: 'X', date: '2024-01-01', stage: EventStage.STUDENT };
      const created = { ...mockEvent, ...dto, id: 'event-99' };
      eventsRepository.create.mockReturnValue(created);
      eventsRepository.save.mockResolvedValue(created);
      eventsRepository.findOne.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(eventsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-99', userId: 'user-1' },
        }),
      );
      expect(result.id).toBe('event-99');
    });
  });

  describe('update', () => {
    it('should update event fields without changing people', async () => {
      const dto = { title: 'Updated Title' };
      const existing = { ...mockEvent };
      const updated = { ...mockEvent, ...dto };
      eventsRepository.findOne.mockResolvedValue(existing);
      eventsRepository.save.mockResolvedValue(updated);
      // findOne 第二次调用应该返回 updated（用于返回）
      eventsRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);

      await service.update('user-1', 'event-1', dto);

      expect(eventsRepository.save).toHaveBeenCalledWith(updated);
      expect(peopleRepository.findBy).not.toHaveBeenCalled();
    });

    it('should replace people when personIds is provided', async () => {
      const dto = { personIds: ['person-1'] };
      const existing = { ...mockEvent, people: [mockPerson] };
      const people = [mockPerson];
      eventsRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, people });
      eventsRepository.save.mockResolvedValue(existing);
      peopleRepository.findBy.mockResolvedValue(people);

      await service.update('user-1', 'event-1', dto);

      expect(peopleRepository.findBy).toHaveBeenCalled();
    });

    it('should clear people when personIds is empty array', async () => {
      const dto = { personIds: [] };
      const existing = { ...mockEvent, people: [mockPerson] };
      eventsRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, people: [] });
      eventsRepository.save.mockResolvedValue(existing);
      // 注意：dto.personIds = [] 仍然 !== undefined，所以会查 findBy 返回空
      peopleRepository.findBy.mockResolvedValue([]);

      await service.update('user-1', 'event-1', dto);

      expect(peopleRepository.findBy).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event missing', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should remove the event', async () => {
      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.remove.mockResolvedValue(mockEvent);

      await service.delete('user-1', 'event-1');

      expect(eventsRepository.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw NotFoundException if event missing', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTimeline', () => {
    it('should group events by year and sort years descending', async () => {
      const e2024 = { ...mockEvent, id: 'e-2024', date: '2024-06-15' };
      const e2024b = { ...mockEvent, id: 'e-2024b', date: '2024-12-31' };
      const e2023 = { ...mockEvent, id: 'e-2023', date: '2023-03-10' };
      const e2022 = { ...mockEvent, id: 'e-2022', date: '2022-07-20' };
      queryBuilder.getManyAndCount.mockResolvedValue([
        [e2024, e2024b, e2023, e2022],
        4,
      ]);

      const result = await service.getTimeline('user-1');

      expect(result.total).toBe(4);
      expect(result.timeline).toHaveLength(3);
      expect(result.timeline.map((t) => t.year)).toEqual([2024, 2023, 2022]);
      expect(result.timeline[0].events).toHaveLength(2);
      expect(result.timeline[1].events).toHaveLength(1);
      expect(result.timeline[2].events).toHaveLength(1);
    });

    it('should filter by startYear', async () => {
      await service.getTimeline('user-1', { startYear: 2020 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'EXTRACT(YEAR FROM event.date) >= :startYear',
        { startYear: 2020 },
      );
    });

    it('should filter by endYear', async () => {
      await service.getTimeline('user-1', { endYear: 2024 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'EXTRACT(YEAR FROM event.date) <= :endYear',
        { endYear: 2024 },
      );
    });

    it('should return empty timeline when no events', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getTimeline('user-1');

      expect(result.timeline).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should join relations for timeline events', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[mockEvent], 1]);

      await service.getTimeline('user-1');

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.place',
        'place',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.people',
        'people',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'event.moments',
        'moments',
      );
    });

    it('should order events by date DESC', async () => {
      await service.getTimeline('user-1');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('event.date', 'DESC');
    });
  });
});
