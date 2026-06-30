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
import { User } from '../users/user.entity';
import { Event } from '../events/event.entity';

@Entity('people')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar'})
  userId: string;

  @ManyToOne(() => User, (user) => user.people, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'varchar'})
  role: string;

  @Column({ type: 'text', nullable: true })
  intro: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar'})
  avatarUrl: string;

  @Column({ name: 'first_seen_at', type: 'date', nullable: true })
  firstSeenAt: string;

  @Column({ name: 'latest_seen_at', type: 'date', nullable: true })
  latestSeenAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToMany(() => Event, (event) => event.people)
  @JoinTable({
    name: 'event_people',
    joinColumn: { name: 'person_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'event_id', referencedColumnName: 'id' },
  })
  events: Event[];
}
