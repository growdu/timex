import { Test, TestingModule } from '@nestjs/testing';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { PlaceType } from './place.entity';

describe('PlacesController', () => {
  let controller: PlacesController;
  let placesService: jest.Mocked<PlacesService>;

  const mockUser = { id: 'user-1' } as any;
  const mockPlace: any = { id: 'place-1', userId: 'user-1', name: 'Beijing' };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlacesController],
      providers: [{ provide: PlacesService, useValue: mockService }],
    }).compile();

    controller = module.get<PlacesController>(PlacesController);
    placesService = module.get(PlacesService);
  });

  it('findAll → forwards pagination', async () => {
    placesService.findAll.mockResolvedValue({ places: [mockPlace], total: 1 });

    await controller.findAll(mockUser, 1, 50);

    expect(placesService.findAll).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 50,
    });
  });

  it('findOne → forwards', async () => {
    placesService.findOne.mockResolvedValue(mockPlace);

    await controller.findOne(mockUser, 'place-1');

    expect(placesService.findOne).toHaveBeenCalledWith('user-1', 'place-1');
  });

  it('create → forwards', async () => {
    const dto: any = { name: 'New', type: PlaceType.TRAVEL };
    placesService.create.mockResolvedValue(mockPlace);

    await controller.create(mockUser, dto);

    expect(placesService.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('update → forwards', async () => {
    placesService.update.mockResolvedValue(mockPlace);

    await controller.update(mockUser, 'place-1', { name: 'X' } as any);

    expect(placesService.update).toHaveBeenCalledWith('user-1', 'place-1', {
      name: 'X',
    });
  });

  it('delete → forwards', async () => {
    placesService.delete.mockResolvedValue(undefined);

    await controller.delete(mockUser, 'place-1');

    expect(placesService.delete).toHaveBeenCalledWith('user-1', 'place-1');
  });
});
