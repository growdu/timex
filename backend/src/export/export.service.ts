import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Memoir } from '../memoirs/memoir.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Event) private eventsRepo: Repository<Event>,
    @InjectRepository(Memoir) private memoirsRepo: Repository<Memoir>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  private async getUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return {
      nickname: user?.nickname || user?.email?.split('@')[0] || '匿名用户',
      email: user?.email,
    };
  }

  // ── 相册导出（事件 + 瞬间 + 人物 + 地点）──
  async exportAlbum(userId: string, year?: number) {
    const user = await this.getUser(userId);
    const qb = this.eventsRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.moments', 'moments')
      .leftJoinAndSelect('e.people', 'people')
      .leftJoinAndSelect('e.place', 'place')
      .where('e.user_id = :userId', { userId })
      .orderBy('e.date', 'ASC');

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM e.date) = :year', { year });
    }

    const events = await qb.getMany();
    const peopleSet = new Set<string>();

    return {
      type: 'album',
      title: year ? `${user.nickname}的${year}时光相册` : `${user.nickname}的时光相册`,
      author: user.nickname,
      generatedAt: new Date().toISOString(),
      period: {
        start: events[0]?.date || null,
        end: events[events.length - 1]?.date || null,
      },
      sections: events.map((e) => {
        e.people?.forEach((p) => peopleSet.add(p.id));
        return {
          event: {
            title: e.title,
            date: e.date,
            location: e.location,
            summary: e.summary,
            stage: e.stage,
          },
          place: e.place ? { name: e.place.name, type: e.place.type } : null,
          people: (e.people || []).map((p) => ({ name: p.name, role: p.role })),
          moments: (e.moments || []).map((m) => ({
            type: m.type,
            title: m.title,
            content: m.content,
            mediaUrl: m.mediaUrl,
            thumbnailUrl: m.thumbnailUrl,
            takenAt: m.takenAt,
          })),
        };
      }),
      stats: {
        totalEvents: events.length,
        totalMoments: events.reduce((s, e) => s + (e.moments?.length || 0), 0),
        totalPeople: peopleSet.size,
      },
    };
  }

  // ── 故事书导出（回忆录 + 章节 + 关联事件）──
  async exportStorybook(userId: string, memoirId: string) {
    const user = await this.getUser(userId);
    const memoir = await this.memoirsRepo.findOne({
      where: { id: memoirId, userId },
      relations: [
        'chapters',
        'chapters.events',
        'chapters.events.moments',
        'chapters.events.people',
        'chapters.events.place',
      ],
    });
    if (!memoir) throw new NotFoundException('回忆录不存在');

    const chapters = (memoir.chapters || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ch) => ({
        title: ch.title,
        content: ch.content,
        sortOrder: ch.sortOrder,
        status: ch.status,
        events: (ch.events || []).map((e) => ({
          title: e.title,
          date: e.date,
          location: e.location,
          summary: e.summary,
          place: e.place ? { name: e.place.name } : null,
          people: (e.people || []).map((p) => ({ name: p.name, role: p.role })),
          moments: (e.moments || []).map((m) => ({
            type: m.type,
            title: m.title,
            content: m.content,
            mediaUrl: m.mediaUrl,
            thumbnailUrl: m.thumbnailUrl,
          })),
        })),
      }));

    return {
      type: 'storybook',
      title: memoir.title,
      blurb: memoir.blurb,
      author: user.nickname,
      generatedAt: new Date().toISOString(),
      chapters,
      stats: {
        totalChapters: chapters.length,
        totalEvents: chapters.reduce((s, c) => s + c.events.length, 0),
        totalMoments: chapters.reduce(
          (s, c) => s + c.events.reduce((ss, e) => ss + e.moments.length, 0),
          0,
        ),
      },
    };
  }

  // ── 时间线导出（全部事件按年分组）──
  async exportTimeline(userId: string) {
    const user = await this.getUser(userId);
    const events = await this.eventsRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.moments', 'moments')
      .leftJoinAndSelect('e.people', 'people')
      .leftJoinAndSelect('e.place', 'place')
      .where('e.user_id = :userId', { userId })
      .orderBy('e.date', 'DESC')
      .getMany();

    const map = new Map<number, any[]>();
    for (const e of events) {
      const yr = new Date(e.date).getFullYear();
      if (!map.has(yr)) map.set(yr, []);
      map.get(yr)!.push({
        title: e.title,
        date: e.date,
        location: e.location,
        summary: e.summary,
        stage: e.stage,
        place: e.place ? { name: e.place.name, type: e.place.type } : null,
        people: (e.people || []).map((p) => p.name),
        momentCount: e.moments?.length || 0,
      });
    }
    const timeline = Array.from(map.entries())
      .map(([year, evs]) => ({ year, events: evs }))
      .sort((a, b) => b.year - a.year);

    return {
      type: 'timeline',
      title: `${user.nickname}的时光线`,
      author: user.nickname,
      generatedAt: new Date().toISOString(),
      timeline,
      stats: {
        totalEvents: events.length,
        yearCount: timeline.length,
        totalMoments: events.reduce((s, e) => s + (e.moments?.length || 0), 0),
      },
    };
  }
}
