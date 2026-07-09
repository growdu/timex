import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Person } from '../people/person.entity';
import { Place } from '../places/place.entity';
import { Moment } from '../moments/moment.entity';
import { Memoir } from '../memoirs/memoir.entity';
import { DashboardConfig, DashboardLayout } from './dashboard-config.entity';

const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { type: 'stats-overview', visible: true, order: 0, size: 'full' },
    { type: 'timeline-chart', visible: true, order: 1, size: 'half' },
    { type: 'line-distribution', visible: true, order: 2, size: 'half' },
    { type: 'recent-events', visible: true, order: 3, size: 'full' },
    { type: 'map-preview', visible: true, order: 4, size: 'half' },
    { type: 'people-grid', visible: true, order: 5, size: 'half' },
    { type: 'place-distribution', visible: true, order: 6, size: 'half' },
    { type: 'memoir-preview', visible: true, order: 7, size: 'half' },
  ],
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Event) private eventsRepo: Repository<Event>,
    @InjectRepository(Person) private peopleRepo: Repository<Person>,
    @InjectRepository(Place) private placesRepo: Repository<Place>,
    @InjectRepository(Moment) private momentsRepo: Repository<Moment>,
    @InjectRepository(Memoir) private memoirsRepo: Repository<Memoir>,
    @InjectRepository(DashboardConfig)
    private configRepo: Repository<DashboardConfig>,
  ) {}

  // ── 仪表盘配置 ──
  async getConfig(userId: string): Promise<DashboardLayout> {
    const row = await this.configRepo.findOne({ where: { userId } });
    return row?.config ?? DEFAULT_LAYOUT;
  }

  async updateConfig(userId: string, widgets: any[]): Promise<DashboardLayout> {
    const layout: DashboardLayout = { widgets };
    let row = await this.configRepo.findOne({ where: { userId } });
    if (!row) {
      row = this.configRepo.create({ userId, config: layout });
    } else {
      row.config = layout;
    }
    await this.configRepo.save(row);
    return layout;
  }

  // ── 统计大屏数据 ──
  async getStats(userId: string) {
    const [events, people, places, moments, memoirs] = await Promise.all([
      this.eventsRepo.count({ where: { userId } }),
      this.peopleRepo.count({ where: { userId } }),
      this.placesRepo.count({ where: { userId } }),
      this.momentsRepo.count({ where: { userId } }),
      this.memoirsRepo.count({ where: { userId } }),
    ]);

    const timelineDistribution = await this.eventsRepo
      .createQueryBuilder('e')
      .select('EXTRACT(YEAR FROM e.date)', 'year')
      .addSelect('COUNT(*)', 'count')
      .where('e.user_id = :userId', { userId })
      .groupBy('year')
      .orderBy('year', 'DESC')
      .getRawMany<{ year: string; count: string }>();

    const stageDistribution = await this.eventsRepo
      .createQueryBuilder('e')
      .select('e.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.stage IS NOT NULL')
      .groupBy('e.stage')
      .orderBy('count', 'DESC')
      .getRawMany<{ stage: string; count: string }>();

    const placeDistribution = await this.eventsRepo
      .createQueryBuilder('e')
      .leftJoin('e.place', 'p')
      .select('p.id', 'placeId')
      .addSelect('p.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('e.user_id = :userId', { userId })
      .andWhere('e.place_id IS NOT NULL')
      .groupBy('p.id, p.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ placeId: string; name: string; count: string }>();

    const momentTypeDist = await this.momentsRepo
      .createQueryBuilder('m')
      .select('m.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('m.user_id = :userId', { userId })
      .groupBy('m.type')
      .getRawMany<{ type: string; count: string }>();

    const recentEvents = await this.eventsRepo.find({
      where: { userId },
      relations: ['place', 'people', 'moments'],
      order: { date: 'DESC' },
      take: 6,
    });

    const topPeople = await this.peopleRepo
      .createQueryBuilder('p')
      .leftJoin('p.events', 'e')
      .select('p.id', 'personId')
      .addSelect('p.name', 'name')
      .addSelect('p.role', 'role')
      .addSelect('COUNT(e.id)', 'eventCount')
      .where('p.user_id = :userId', { userId })
      .groupBy('p.id, p.name, p.role')
      .orderBy('COUNT(e.id)', 'DESC')
      .limit(6)
      .getRawMany<{ personId: string; name: string; role: string; eventCount: string }>();

    const yearRaw = await this.eventsRepo
      .createQueryBuilder('e')
      .select('MIN(EXTRACT(YEAR FROM e.date))', 'earliest')
      .addSelect('MAX(EXTRACT(YEAR FROM e.date))', 'latest')
      .where('e.user_id = :userId', { userId })
      .getRawOne<{ earliest: string; latest: string }>();

    const memoirList = await this.memoirsRepo.find({
      where: { userId },
      relations: ['chapters'],
      order: { updatedAt: 'DESC' },
      take: 3,
    });

    return {
      totals: { events, people, places, moments, memoirs },
      yearRange: {
        earliest: yearRaw?.earliest ? parseInt(yearRaw.earliest, 10) : null,
        latest: yearRaw?.latest ? parseInt(yearRaw.latest, 10) : null,
      },
      timelineDistribution: timelineDistribution.map((r) => ({
        year: parseInt(r.year, 10),
        count: parseInt(r.count, 10),
      })),
      stageDistribution: stageDistribution.map((r) => ({
        stage: r.stage,
        count: parseInt(r.count, 10),
      })),
      placeDistribution: placeDistribution.map((r) => ({
        placeId: r.placeId,
        name: r.name,
        count: parseInt(r.count, 10),
      })),
      momentTypeDistribution: momentTypeDist.map((r) => ({
        type: r.type,
        count: parseInt(r.count, 10),
      })),
      recentEvents,
      topPeople: topPeople.map((r) => ({
        personId: r.personId,
        name: r.name,
        role: r.role,
        eventCount: parseInt(r.eventCount, 10),
      })),
      memoirs: memoirList.map((m) => ({
        id: m.id,
        title: m.title,
        blurb: m.blurb,
        status: m.status,
        chapterCount: m.chapters?.length ?? 0,
      })),
    };
  }
}
