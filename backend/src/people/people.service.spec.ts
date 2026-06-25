import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PeopleService } from './people.service';
import { Person } from './person.entity';

describe('PeopleService', () => {
  let service: PeopleService;
  let peopleRepository: jest.Mocked<any>;

  const mockPerson: Partial<Person> = {
    id: 'person-1',
    userId: 'user-1',
    name: 'Test Person',
    role: 'Friend',
    intro: 'A test person',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        {
          provide: getRepositoryToken(Person),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
    peopleRepository = module.get(getRepositoryToken(Person));
  });

  describe('findAll', () => {
    it('should return paginated people', async () => {
      const people = [mockPerson];
      peopleRepository.findAndCount.mockResolvedValue([people, 1]);

      const result = await service.findAll('user-1', { page: 1, limit: 50 });

      expect(result.people).toEqual(people);
      expect(result.total).toBe(1);
      expect(peopleRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['events'],
        order: { name: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should use default pagination values', async () => {
      peopleRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('user-1');

      expect(peopleRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['events'],
        order: { name: 'ASC' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('findOne', () => {
    it('should return a person by id', async () => {
      peopleRepository.findOne.mockResolvedValue(mockPerson);

      const result = await service.findOne('user-1', 'person-1');

      expect(result).toEqual(mockPerson);
      expect(peopleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'person-1', userId: 'user-1' },
        relations: ['events'],
      });
    });

    it('should throw NotFoundException if person not found', async () => {
      peopleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'person-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new person', async () => {
      const createDto = {
        name: 'New Person',
        role: 'Colleague',
        intro: 'A new colleague',
      };
      peopleRepository.create.mockReturnValue(mockPerson);
      peopleRepository.save.mockResolvedValue(mockPerson);
      peopleRepository.findOne.mockResolvedValue(mockPerson);

      const result = await service.create('user-1', createDto);

      expect(peopleRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...createDto,
      });
      expect(peopleRepository.save).toHaveBeenCalled();
    });

    it('should create person with avatarUrl', async () => {
      const createDto = {
        name: 'New Person',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };
      peopleRepository.create.mockReturnValue(mockPerson);
      peopleRepository.save.mockResolvedValue(mockPerson);
      peopleRepository.findOne.mockResolvedValue(mockPerson);

      await service.create('user-1', createDto);

      expect(peopleRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing person', async () => {
      const updateDto = { name: 'Updated Name', role: 'Best Friend' };
      const updatedPerson = { ...mockPerson, ...updateDto };

      peopleRepository.findOne
        .mockResolvedValueOnce(mockPerson)
        .mockResolvedValueOnce(updatedPerson);
      peopleRepository.save.mockResolvedValue(updatedPerson);

      const result = await service.update('user-1', 'person-1', updateDto);

      expect(peopleRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should throw NotFoundException if person not found', async () => {
      peopleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'person-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a person', async () => {
      peopleRepository.findOne.mockResolvedValue(mockPerson);
      peopleRepository.remove.mockResolvedValue(mockPerson);

      await service.delete('user-1', 'person-1');

      expect(peopleRepository.remove).toHaveBeenCalledWith(mockPerson);
    });

    it('should throw NotFoundException if person not found', async () => {
      peopleRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'person-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
