import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PlacesService } from './places.service';
import { Place, PlaceType } from './place.entity';

describe('PlacesService', () => {
  let service: PlacesService;
  let placesRepository: jest.Mocked<any>;

  const mockPlace: any = {
    id: 'place-1',
    userId: 'user-1',
    name: 'Test Place',
    type: PlaceType.CITY,
    summary: 'A test place',
    lat: 39.9,
    lng: 116.4,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlacesService,
        {
          provide: getRepositoryToken(Place),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PlacesService>(PlacesService);
    placesRepository = module.get(getRepositoryToken(Place));
  });

  describe('findAll', () => {
    it('should return paginated places ordered by name', async () => {
      const places = [mockPlace];
      placesRepository.findAndCount.mockResolvedValue([places, 1]);

      const result = await service.findAll('user-1', { page: 1, limit: 50 });

      expect(result.places).toEqual(places);
      expect(result.total).toBe(1);
      expect(placesRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { name: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should use default pagination (page=1, limit=50)', async () => {
      placesRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1');

      expect(placesRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { name: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should skip the correct number of records', async () => {
      placesRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1', { page: 3, limit: 10 });

      expect(placesRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should return empty when no places', async () => {
      placesRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll('user-1');

      expect(result.places).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a place by id and userId', async () => {
      placesRepository.findOne.mockResolvedValue(mockPlace);

      const result = await service.findOne('user-1', 'place-1');

      expect(result).toEqual(mockPlace);
      expect(placesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'place-1', userId: 'user-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      placesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not return place belonging to another user', async () => {
      // Repository.findOne with {id, userId} won't find a cross-user record
      placesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-2', 'place-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a place with userId injected', async () => {
      const dto = {
        name: 'New Place',
        type: PlaceType.TRAVEL,
        lat: 31.2,
        lng: 121.5,
      };
      const createdPlace = { ...mockPlace, ...dto };
      placesRepository.create.mockReturnValue(createdPlace);
      placesRepository.save.mockResolvedValue(createdPlace);
      placesRepository.findOne.mockResolvedValue(createdPlace);

      const result = await service.create('user-1', dto);

      expect(placesRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...dto,
      });
      expect(placesRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdPlace);
    });

    it('should return the freshly created place via findOne', async () => {
      const dto = { name: 'New' };
      const created = { ...mockPlace, ...dto, id: 'place-2' };
      placesRepository.create.mockReturnValue(created);
      placesRepository.save.mockResolvedValue(created);
      placesRepository.findOne.mockResolvedValue(created);

      const result = await service.create('user-1', dto);

      expect(placesRepository.findOne).toHaveBeenCalled();
      expect(result.id).toBe('place-2');
    });
  });

  describe('update', () => {
    it('should update an existing place', async () => {
      const dto = { name: 'Renamed', summary: 'Updated summary' };
      const updatedPlace = { ...mockPlace, ...dto };
      placesRepository.findOne
        .mockResolvedValueOnce(mockPlace)
        .mockResolvedValueOnce(updatedPlace);
      placesRepository.save.mockResolvedValue(updatedPlace);

      const result = await service.update('user-1', 'place-1', dto);

      expect(placesRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Renamed');
    });

    it('should throw NotFoundException if place not found', async () => {
      placesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'missing', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should remove the place', async () => {
      placesRepository.findOne.mockResolvedValue(mockPlace);
      placesRepository.remove.mockResolvedValue(mockPlace);

      await service.delete('user-1', 'place-1');

      expect(placesRepository.remove).toHaveBeenCalledWith(mockPlace);
    });

    it('should throw NotFoundException if place not found', async () => {
      placesRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
