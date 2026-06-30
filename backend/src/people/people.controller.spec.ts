import { Test, TestingModule } from '@nestjs/testing';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

describe('PeopleController', () => {
  let controller: PeopleController;
  let peopleService: jest.Mocked<PeopleService>;

  const mockUser = { id: 'user-1' } as any;
  const mockPerson: any = { id: 'person-1', userId: 'user-1', name: 'Alice' };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeopleController],
      providers: [{ provide: PeopleService, useValue: mockService }],
    }).compile();

    controller = module.get<PeopleController>(PeopleController);
    peopleService = module.get(PeopleService);
  });

  it('findAll → forwards userId and pagination', async () => {
    peopleService.findAll.mockResolvedValue({ people: [mockPerson], total: 1 });

    await controller.findAll(mockUser, 2, 25);

    expect(peopleService.findAll).toHaveBeenCalledWith('user-1', {
      page: 2,
      limit: 25,
    });
  });

  it('findAll → undefined pagination passes through', async () => {
    peopleService.findAll.mockResolvedValue({ people: [], total: 0 });

    await controller.findAll(mockUser, undefined, undefined);

    expect(peopleService.findAll).toHaveBeenCalledWith('user-1', {
      page: undefined,
      limit: undefined,
    });
  });

  it('findOne → forwards userId and id', async () => {
    peopleService.findOne.mockResolvedValue(mockPerson);

    await controller.findOne(mockUser, 'person-1');

    expect(peopleService.findOne).toHaveBeenCalledWith('user-1', 'person-1');
  });

  it('create → forwards userId and dto', async () => {
    const dto = { name: 'Bob', role: 'Friend' };
    peopleService.create.mockResolvedValue(mockPerson);

    await controller.create(mockUser, dto);

    expect(peopleService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('update → forwards userId, id, dto', async () => {
    const dto = { name: 'Updated' };
    peopleService.update.mockResolvedValue(mockPerson);

    await controller.update(mockUser, 'person-1', dto as any);

    expect(peopleService.update).toHaveBeenCalledWith(
      'user-1',
      'person-1',
      dto,
    );
  });

  it('delete → forwards userId and id', async () => {
    peopleService.delete.mockResolvedValue(undefined);

    await controller.delete(mockUser, 'person-1');

    expect(peopleService.delete).toHaveBeenCalledWith('user-1', 'person-1');
  });
});
