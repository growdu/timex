import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Memoir } from './memoir.entity';
import { MemoirStatus } from './memoir-status.enum';
import { MemoirChapter } from './memoir-chapter.entity';

@Injectable()
export class MemoirsService {
  constructor(
    @InjectRepository(Memoir)
    private memoirsRepository: Repository<Memoir>,
    @InjectRepository(MemoirChapter)
    private chaptersRepository: Repository<MemoirChapter>,
  ) {}

  async findAll(
    userId: string,
    options: { status?: MemoirStatus; page?: number; limit?: number } = {},
  ): Promise<{ memoirs: Memoir[]; total: number }> {
    const { status, page = 1, limit = 20 } = options;

    const query = this.memoirsRepository
      .createQueryBuilder('memoir')
      .leftJoinAndSelect('memoir.chapters', 'chapters')
      .where('memoir.userId = :userId', { userId });

    if (status) {
      query.andWhere('memoir.status = :status', { status });
    }

    query.orderBy('memoir.updatedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [memoirs, total] = await query.getManyAndCount();

    return { memoirs, total };
  }

  async findOne(userId: string, memoirId: string): Promise<Memoir> {
    const memoir = await this.memoirsRepository.findOne({
      where: { id: memoirId, userId },
      relations: ['chapters'],
    });

    if (!memoir) {
      throw new NotFoundException('Memoir not found');
    }

    memoir.chapters.sort((a, b) => a.sortOrder - b.sortOrder);

    return memoir;
  }

  async create(
    userId: string,
    dto: { title: string; blurb?: string },
  ): Promise<Memoir> {
    const memoir = this.memoirsRepository.create({ userId, ...dto });
    await this.memoirsRepository.save(memoir);
    return this.findOne(userId, memoir.id);
  }

  async update(
    userId: string,
    memoirId: string,
    dto: Partial<Memoir>,
  ): Promise<Memoir> {
    const memoir = await this.findOne(userId, memoirId);
    Object.assign(memoir, dto);
    await this.memoirsRepository.save(memoir);
    return this.findOne(userId, memoirId);
  }

  async delete(userId: string, memoirId: string): Promise<void> {
    const memoir = await this.findOne(userId, memoirId);
    await this.memoirsRepository.remove(memoir);
  }

  async getShareToken(userId: string, memoirId: string): Promise<string> {
    const memoir = await this.findOne(userId, memoirId);

    if (!memoir.shareToken) {
      memoir.shareToken = uuidv4();
      await this.memoirsRepository.save(memoir);
    }

    return memoir.shareToken;
  }

  async getByShareToken(shareToken: string): Promise<Memoir> {
    const memoir = await this.memoirsRepository.findOne({
      where: { shareToken },
      relations: ['chapters'],
    });

    if (!memoir) {
      throw new NotFoundException('Memoir not found');
    }

    if (!memoir.isPublic) {
      throw new NotFoundException('Memoir is not public');
    }

    memoir.chapters.sort((a, b) => a.sortOrder - b.sortOrder);

    return memoir;
  }

  // Chapter operations
  async addChapter(
    userId: string,
    memoirId: string,
    dto: { title: string; content?: string; sortOrder?: number },
  ): Promise<MemoirChapter> {
    const memoir = await this.findOne(userId, memoirId);

    const maxSortOrder = memoir.chapters.reduce(
      (max, ch) => Math.max(max, ch.sortOrder),
      -1,
    );

    const chapter = this.chaptersRepository.create({
      memoirId: memoir.id,
      title: dto.title,
      content: dto.content,
      sortOrder: dto.sortOrder ?? maxSortOrder + 1,
    });

    await this.chaptersRepository.save(chapter);

    return chapter;
  }

  async updateChapter(
    userId: string,
    memoirId: string,
    chapterId: string,
    dto: Partial<MemoirChapter>,
  ): Promise<MemoirChapter> {
    await this.findOne(userId, memoirId);

    const chapter = await this.chaptersRepository.findOne({
      where: { id: chapterId, memoirId },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    Object.assign(chapter, dto);
    await this.chaptersRepository.save(chapter);

    return chapter;
  }

  async deleteChapter(
    userId: string,
    memoirId: string,
    chapterId: string,
  ): Promise<void> {
    await this.findOne(userId, memoirId);

    const chapter = await this.chaptersRepository.findOne({
      where: { id: chapterId, memoirId },
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    await this.chaptersRepository.remove(chapter);
  }
}
