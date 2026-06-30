import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './event.entity';
import { EventStage } from './event-stage.enum';
import { Person } from '../people/person.entity';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<any>;
  let peopleRepository: jest.Mocked<any>;
  let queryBuilderMock: any;

  const mockEvent: Partial<Event> = {
    id: 'event-1',
    userId: 'user-1',
    title: 'Test Event',
    date: '2024-01-01',
    location: 'Test Location',
    stage: EventStage.MAKER,
    summary: 'Test summary',
    weight: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPerson: Partial<Person> = {
    id: 'person-1',
    userId: 'user-1',
    name: 'Test Person',
    role: 'Friend',
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

    const mockEventsRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
    };

    const mockPeopleRepo = {
      findOne: jest.fn(),
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
    it('should return paginated events', async () => {
      const events = [mockEvent];
      queryBuilderMock.getManyAndCount.mockResolvedValue([events, 1]);

      const result = await service.findAll('user-1', { page: 1, limit: 20 });

      expect(result.events).toEqual(events);
      expect(result.total).toBe(1);
    });

    it('should filter events by year', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1', { year: 2024 });

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });

    it('should filter events by stage', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1', { stage: EventStage.MAKER });

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });

    it('should filter events by keyword', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1', { keyword: 'test' });

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      eventsRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.findOne('user-1', 'event-1');

      expect(result).toEqual(mockEvent);
      expect(eventsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-1', userId: 'user-1' },
        relations: ['place', 'people', 'moments'],
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'event-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createDto = {
        title: 'New Event',
        date: '2024-01-01',
        location: 'New Location',
      };
      eventsRepository.create.mockReturnValue(mockEvent);
      eventsRepository.save.mockResolvedValue(mockEvent);
      eventsRepository.findOne.mockResolvedValue(mockEvent);

      await service.create('user-1', createDto);

      expect(eventsRepository.create).toHaveBeenCalled();
      expect(eventsRepository.save).toHaveBeenCalled();
    });

    it('should associate people with event if personIds provided', async () => {
      const createDto = {
        title: 'New Event',
        date: '2024-01-01',
        personIds: ['person-1'],
      };
      eventsRepository.create.mockReturnValue(mockEvent);
      eventsRepository.save.mockResolvedValue(mockEvent);
      eventsRepository.findOne.mockResolvedValue(mockEvent);
      peopleRepository.findBy.mockResolvedValue([mockPerson]);

      await service.create('user-1', createDto);

      expect(peopleRepository.findBy).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing event', async () => {
      const updateDto = { title: 'Updated Title' };
      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.save.mockResolvedValue({ ...mockEvent, ...updateDto });
      eventsRepository.findOne.mockResolvedValueOnce(mockEvent);
      eventsRepository.findOne.mockResolvedValueOnce({
        ...mockEvent,
        ...updateDto,
      });

      await service.update('user-1', 'event-1', updateDto);

      expect(eventsRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      eventsRepository.findOne.mockResolvedValue(mockEvent);
      eventsRepository.remove.mockResolvedValue(mockEvent);

      await service.delete('user-1', 'event-1');

      expect(eventsRepository.remove).toHaveBeenCalledWith(mockEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      eventsRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'event-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTimeline', () => {
    it('should return events grouped by year', async () => {
      const events = [
        { ...mockEvent, date: '2024-01-01' },
        { ...mockEvent, id: 'event-2', date: '2024-06-01' },
        { ...mockEvent, id: 'event-3', date: '2023-01-01' },
      ];
      queryBuilderMock.getManyAndCount.mockResolvedValue([events, 3]);

      const result = await service.getTimeline('user-1');

      expect(result.timeline).toBeDefined();
      expect(result.total).toBe(3);
    });

    it('should filter timeline by year range', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getTimeline('user-1', { startYear: 2020, endYear: 2024 });

      expect(queryBuilderMock.andWhere).toHaveBeenCalled();
    });
  });
});
