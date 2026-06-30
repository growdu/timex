import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventStage } from './event-stage.enum';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<EventsService>;

  const mockUser = { id: 'user-1' } as any;
  const mockEvent: any = { id: 'event-1', userId: 'user-1', title: 'X' };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getTimeline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockService }],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventsService = module.get(EventsService);
  });

  describe('findAll', () => {
    it('forwards all query params', async () => {
      eventsService.findAll.mockResolvedValue({ events: [mockEvent], total: 1 });

      await controller.findAll(mockUser, 2024, EventStage.STUDENT, 'wedding', 1, 20);

      expect(eventsService.findAll).toHaveBeenCalledWith('user-1', {
        year: 2024,
        stage: EventStage.STUDENT,
        keyword: 'wedding',
        page: 1,
        limit: 20,
      });
    });

    it('handles undefined query params', async () => {
      eventsService.findAll.mockResolvedValue({ events: [], total: 0 });

      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(eventsService.findAll).toHaveBeenCalledWith('user-1', {
        year: undefined,
        stage: undefined,
        keyword: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  describe('getTimeline', () => {
    it('forwards year range and pagination', async () => {
      eventsService.getTimeline.mockResolvedValue({ timeline: [], total: 0 });

      await controller.getTimeline(mockUser, 2020, 2024, 1, 10);

      expect(eventsService.getTimeline).toHaveBeenCalledWith('user-1', {
        startYear: 2020,
        endYear: 2024,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('forwards userId and id', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);

      await controller.findOne(mockUser, 'event-1');

      expect(eventsService.findOne).toHaveBeenCalledWith('user-1', 'event-1');
    });
  });

  describe('create', () => {
    it('forwards dto', async () => {
      const dto: any = {
        title: 'X',
        date: '2024-01-01',
        stage: EventStage.STUDENT,
      };
      eventsService.create.mockResolvedValue(mockEvent);

      await controller.create(mockUser, dto);

      expect(eventsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('update', () => {
    it('forwards dto', async () => {
      const dto: any = { title: 'Updated' };
      eventsService.update.mockResolvedValue(mockEvent);

      await controller.update(mockUser, 'event-1', dto);

      expect(eventsService.update).toHaveBeenCalledWith('user-1', 'event-1', dto);
    });
  });

  describe('delete', () => {
    it('forwards id', async () => {
      eventsService.delete.mockResolvedValue(undefined);

      await controller.delete(mockUser, 'event-1');

      expect(eventsService.delete).toHaveBeenCalledWith('user-1', 'event-1');
    });
  });
});