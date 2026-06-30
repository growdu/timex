import { Test, TestingModule } from '@nestjs/testing';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { MomentType } from './moment.entity';

describe('MomentsController', () => {
  let controller: MomentsController;
  let momentsService: jest.Mocked<MomentsService>;

  const mockUser = { id: 'user-1' } as any;
  const mockMoment: any = { id: 'moment-1', userId: 'user-1' };

  beforeEach(async () => {
    const mockService = {
      findByEvent: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MomentsController],
      providers: [{ provide: MomentsService, useValue: mockService }],
    }).compile();

    controller = module.get<MomentsController>(MomentsController);
    momentsService = module.get(MomentsService);
  });

  describe('findAll', () => {
    it('forwards type, eventId, and pagination', async () => {
      momentsService.findAll.mockResolvedValue({
        moments: [mockMoment],
        total: 1,
      });

      await controller.findAll(mockUser, MomentType.PHOTO, 'event-1', 1, 50);

      expect(momentsService.findAll).toHaveBeenCalledWith('user-1', {
        type: MomentType.PHOTO,
        eventId: 'event-1',
        page: 1,
        limit: 50,
      });
    });

    it('handles undefined filters', async () => {
      momentsService.findAll.mockResolvedValue({ moments: [], total: 0 });

      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(momentsService.findAll).toHaveBeenCalledWith('user-1', {
        type: undefined,
        eventId: undefined,
        page: undefined,
        limit: undefined,
      });
    });
  });

  it('findOne → forwards', async () => {
    momentsService.findOne.mockResolvedValue(mockMoment);

    await controller.findOne(mockUser, 'moment-1');

    expect(momentsService.findOne).toHaveBeenCalledWith('user-1', 'moment-1');
  });

  it('create → forwards dto', async () => {
    const dto: any = {
      eventId: 'event-1',
      type: MomentType.PHOTO,
      mediaUrl: 'x',
    };
    momentsService.create.mockResolvedValue(mockMoment);

    await controller.create(mockUser, dto);

    expect(momentsService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('update → forwards dto', async () => {
    momentsService.update.mockResolvedValue(mockMoment);

    await controller.update(mockUser, 'moment-1', { content: 'X' });

    expect(momentsService.update).toHaveBeenCalledWith('user-1', 'moment-1', {
      content: 'X',
    });
  });

  it('delete → forwards', async () => {
    momentsService.delete.mockResolvedValue(undefined);

    await controller.delete(mockUser, 'moment-1');

    expect(momentsService.delete).toHaveBeenCalledWith('user-1', 'moment-1');
  });
});
