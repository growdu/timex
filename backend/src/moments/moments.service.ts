import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Moment, MomentType } from './moment.entity';
import { CreateMomentDto, UpdateMomentDto } from './dto/moment.dto';

@Injectable()
export class MomentsService {
  constructor(
    @InjectRepository(Moment)
    private momentsRepository: Repository<Moment>,
  ) {}

  async findByEvent(
    userId: string,
    eventId: string,
    options: { type?: MomentType; page?: number; limit?: number } = {},
  ): Promise<{ moments: Moment[]; total: number }> {
    const { type, page = 1, limit = 50 } = options;

    const query = this.momentsRepository
      .createQueryBuilder('moment')
      .where('moment.userId = :userId', { userId })
      .andWhere('moment.eventId = :eventId', { eventId });

    if (type) {
      query.andWhere('moment.type = :type', { type });
    }

    query.orderBy('moment.takenAt', 'ASC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [moments, total] = await query.getManyAndCount();

    return { moments, total };
  }

  async findAll(
    userId: string,
    options: {
      type?: MomentType;
      eventId?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ moments: Moment[]; total: number }> {
    const { type, eventId, page = 1, limit = 50 } = options;

    const query = this.momentsRepository
      .createQueryBuilder('moment')
      .leftJoinAndSelect('moment.event', 'event')
      .where('moment.userId = :userId', { userId });

    if (type) {
      query.andWhere('moment.type = :type', { type });
    }

    if (eventId) {
      query.andWhere('moment.eventId = :eventId', { eventId });
    }

    query.orderBy('moment.takenAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [moments, total] = await query.getManyAndCount();

    return { moments, total };
  }

  async findOne(userId: string, momentId: string): Promise<Moment> {
    const moment = await this.momentsRepository.findOne({
      where: { id: momentId, userId },
      relations: ['event'],
    });

    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    return moment;
  }

  async create(userId: string, dto: CreateMomentDto): Promise<Moment> {
    const moment = this.momentsRepository.create({
      userId,
      ...dto,
      takenAt: dto.takenAt ? new Date(dto.takenAt) : new Date(),
    });

    await this.momentsRepository.save(moment);

    return this.findOne(userId, moment.id);
  }

  async update(
    userId: string,
    momentId: string,
    dto: UpdateMomentDto,
  ): Promise<Moment> {
    const moment = await this.findOne(userId, momentId);

    Object.assign(moment, dto);

    await this.momentsRepository.save(moment);

    return this.findOne(userId, momentId);
  }

  async delete(userId: string, momentId: string): Promise<void> {
    const moment = await this.findOne(userId, momentId);
    await this.momentsRepository.remove(moment);
  }
}
