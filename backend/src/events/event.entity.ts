import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Place } from '../places/place.entity';
import { Moment } from '../moments/moment.entity';
import { Person } from '../people/person.entity';
import { MemoirChapter } from '../memoirs/memoir-chapter.entity';
import { EventStage } from './event-stage.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'place_id', nullable: true })
  placeId: string;

  @ManyToOne(() => Place, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'place_id' })
  place: Place;

  @Column({
    type: 'enum',
    enum: EventStage,
    nullable: true,
  })
  stage: EventStage;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ name: 'long_text', type: 'text', nullable: true })
  longText: string;

  @Column({ name: 'cover_url', nullable: true })
  coverUrl: string;

  @Column({ default: 0 })
  weight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Moment, (moment) => moment.event)
  moments: Moment[];

  @ManyToMany(() => Person, (person) => person.events)
  @JoinTable({
    name: 'event_people',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'person_id', referencedColumnName: 'id' },
  })
  people: Person[];

  @ManyToMany(() => MemoirChapter, (chapter) => chapter.events)
  @JoinTable({
    name: 'chapter_events',
    joinColumn: { name: 'event_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'chapter_id', referencedColumnName: 'id' },
  })
  chapters: MemoirChapter[];
}
