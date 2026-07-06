import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PlaceType {
  CITY = 'city',
  TRAVEL = 'travel',
  FAMILY = 'family',
  DAILY = 'daily',
}

@Entity('places')
export class Place {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (user) => user.places, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PlaceType,
    nullable: true,
  })
  type: PlaceType;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'first_seen_at', type: 'date', nullable: true })
  firstSeenAt: string;

  @Column({ name: 'latest_seen_at', type: 'date', nullable: true })
  latestSeenAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
