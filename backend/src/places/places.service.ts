import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Place } from './place.entity';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private placesRepository: Repository<Place>,
  ) {}

  async findAll(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ places: Place[]; total: number }> {
    const { page = 1, limit = 50 } = options;

    const [places, total] = await this.placesRepository.findAndCount({
      where: { userId },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { places, total };
  }

  async findOne(userId: string, placeId: string): Promise<Place> {
    const place = await this.placesRepository.findOne({
      where: { id: placeId, userId },
    });

    if (!place) {
      throw new NotFoundException('Place not found');
    }

    return place;
  }

  async create(userId: string, dto: Partial<Place>): Promise<Place> {
    const place = this.placesRepository.create({ userId, ...dto });
    await this.placesRepository.save(place);
    return this.findOne(userId, place.id);
  }

  async update(
    userId: string,
    placeId: string,
    dto: Partial<Place>,
  ): Promise<Place> {
    const place = await this.findOne(userId, placeId);
    Object.assign(place, dto);
    await this.placesRepository.save(place);
    return this.findOne(userId, placeId);
  }

  async delete(userId: string, placeId: string): Promise<void> {
    const place = await this.findOne(userId, placeId);
    await this.placesRepository.remove(place);
  }
}
