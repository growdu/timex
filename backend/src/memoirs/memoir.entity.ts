import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { MemoirChapter } from './memoir-chapter.entity';
import { MemoirStatus } from './memoir-status.enum';

@Entity('memoirs')
export class Memoir {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.memoirs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  blurb: string | null;

  @Column({
    type: 'enum',
    enum: MemoirStatus,
    default: MemoirStatus.DRAFT,
  })
  status: MemoirStatus;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl: string | null;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'share_token', unique: true, nullable: true })
  shareToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MemoirChapter, (chapter) => chapter.memoir)
  chapters: MemoirChapter[];
}
