import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from './person.entity';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private peopleRepository: Repository<Person>,
  ) {}

  async findAll(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ people: Person[]; total: number }> {
    const { page = 1, limit = 50 } = options;

    const [people, total] = await this.peopleRepository.findAndCount({
      where: { userId },
      relations: ['events'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { people, total };
  }

  async findOne(userId: string, personId: string): Promise<Person> {
    const person = await this.peopleRepository.findOne({
      where: { id: personId, userId },
      relations: ['events'],
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async create(
    userId: string,
    dto: { name: string; role?: string; intro?: string; avatarUrl?: string },
  ): Promise<Person> {
    const person = this.peopleRepository.create({ userId, ...dto });
    await this.peopleRepository.save(person);
    return this.findOne(userId, person.id);
  }

  async update(
    userId: string,
    personId: string,
    dto: Partial<Person>,
  ): Promise<Person> {
    const person = await this.findOne(userId, personId);
    Object.assign(person, dto);
    await this.peopleRepository.save(person);
    return this.findOne(userId, personId);
  }

  async delete(userId: string, personId: string): Promise<void> {
    const person = await this.findOne(userId, personId);
    await this.peopleRepository.remove(person);
  }
}
