import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';

export enum MomentType {
  PHOTO = 'photo',
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
}

@Entity('moments')
export class Moment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.moments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'event_id', nullable: true })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.moments, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ type: 'enum', enum: MomentType })
  type: MomentType;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'media_url', nullable: true })
  mediaUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ name: 'taken_at', type: 'timestamp', nullable: true })
  takenAt: Date;

  @Column({ name: 'ai_tags', type: 'jsonb', nullable: true })
  aiTags: string[];

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string;

  @Column({ type: 'text', nullable: true })
  transcript: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
