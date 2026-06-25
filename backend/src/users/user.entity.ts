import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { License } from '../license/license.entity';
import { Device } from '../devices/device.entity';
import { Event } from '../events/event.entity';
import { Moment } from '../moments/moment.entity';
import { Person } from '../people/person.entity';
import { Place } from '../places/place.entity';
import { Memoir } from '../memoirs/memoir.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_trial_active', default: true })
  isTrialActive: boolean;

  @Column({ name: 'trial_expires_at', nullable: true })
  trialExpiresAt: Date;

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => License, (license) => license.user)
  licenses: License[];

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

  @OneToMany(() => Event, (event) => event.user)
  events: Event[];

  @OneToMany(() => Moment, (moment) => moment.user)
  moments: Moment[];

  @OneToMany(() => Person, (person) => person.user)
  people: Person[];

  @OneToMany(() => Place, (place) => place.user)
  places: Place[];

  @OneToMany(() => Memoir, (memoir) => memoir.user)
  memoirs: Memoir[];
}
