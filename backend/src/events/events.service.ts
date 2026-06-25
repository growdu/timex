import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Event } from './event.entity';
import { EventStage } from './event-stage.enum';
import { Person } from '../people/person.entity';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(Person)
    private peopleRepository: Repository<Person>,
  ) {}

  async findAll(
    userId: string,
    options: {
      year?: number;
      stage?: EventStage;
      keyword?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ events: Event[]; total: number }> {
    const { year, stage, keyword, page = 1, limit = 20 } = options;

    const query = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.place', 'place')
      .leftJoinAndSelect('event.people', 'people')
      .leftJoinAndSelect('event.moments', 'moments')
      .where('event.userId = :userId', { userId });

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM event.date) = :year', { year });
    }

    if (stage) {
      query.andWhere('event.stage = :stage', { stage });
    }

    if (keyword) {
      query.andWhere(
        '(event.title ILIKE :keyword OR event.summary ILIKE :keyword)',
        {
          keyword: `%${keyword}%`,
        },
      );
    }

    query.orderBy('event.date', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [events, total] = await query.getManyAndCount();

    return { events, total };
  }

  async findOne(userId: string, eventId: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId, userId },
      relations: ['place', 'people', 'moments'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async create(userId: string, dto: CreateEventDto): Promise<Event> {
    const event = this.eventsRepository.create({
      userId,
      ...dto,
    });

    await this.eventsRepository.save(event);

    if (dto.personIds && dto.personIds.length > 0) {
      const people = await this.peopleRepository.findBy({
        id: dto.personIds as any,
        userId,
      });
      event.people = people;
    }

    return this.findOne(userId, event.id);
  }

  async update(
    userId: string,
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.findOne(userId, eventId);

    Object.assign(event, dto);

    await this.eventsRepository.save(event);

    if (dto.personIds !== undefined) {
      const people = await this.peopleRepository.findBy({
        id: dto.personIds as any,
        userId,
      });
      event.people = people;
    }

    return this.findOne(userId, event.id);
  }

  async delete(userId: string, eventId: string): Promise<void> {
    const event = await this.findOne(userId, eventId);
    await this.eventsRepository.remove(event);
  }

  async getTimeline(
    userId: string,
    options: {
      startYear?: number;
      endYear?: number;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ timeline: { year: number; events: Event[] }[]; total: number }> {
    const { startYear, endYear, page = 1, limit = 50 } = options;

    const query = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.place', 'place')
      .leftJoinAndSelect('event.people', 'people')
      .leftJoinAndSelect('event.moments', 'moments')
      .where('event.userId = :userId', { userId });

    if (startYear) {
      query.andWhere('EXTRACT(YEAR FROM event.date) >= :startYear', {
        startYear,
      });
    }

    if (endYear) {
      query.andWhere('EXTRACT(YEAR FROM event.date) <= :endYear', { endYear });
    }

    query.orderBy('event.date', 'DESC');

    const [events, total] = await query.getManyAndCount();

    // Group by year
    const timelineMap = new Map<number, Event[]>();
    for (const event of events) {
      const year = new Date(event.date).getFullYear();
      if (!timelineMap.has(year)) {
        timelineMap.set(year, []);
      }
      timelineMap.get(year)!.push(event);
    }

    const timeline = Array.from(timelineMap.entries())
      .map(([year, yearEvents]) => ({ year, events: yearEvents }))
      .sort((a, b) => b.year - a.year);

    return { timeline, total };
  }
}
