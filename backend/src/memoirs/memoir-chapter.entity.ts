import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Memoir } from './memoir.entity';
import { MemoirStatus } from './memoir-status.enum';
import { Event } from '../events/event.entity';

@Entity('memoir_chapters')
export class MemoirChapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'memoir_id', type: 'varchar'})
  memoirId: string;

  @ManyToOne(() => Memoir, (memoir) => memoir.chapters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memoir_id' })
  memoir: Memoir;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'sort_order', default: 0, type: 'int'})
  sortOrder: number;

  @Column({ name: 'cover_url', nullable: true, type: 'varchar'})
  coverUrl: string;

  @Column({
    type: 'enum',
    enum: MemoirStatus,
    default: MemoirStatus.DRAFT,
  })
  status: MemoirStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToMany(() => Event, (event) => event.chapters)
  @JoinTable({
    name: 'chapter_events',
    joinColumn: { name: 'chapter_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'event_id', referencedColumnName: 'id' },
  })
  events: Event[];
}
