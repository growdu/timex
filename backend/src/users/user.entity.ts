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

  @Column({ unique: true, type: 'varchar'})
  email: string;

  @Column({ unique: true, nullable: true, type: 'varchar'})
  phone: string;

  @Column({ name: 'password_hash', type: 'varchar'})
  passwordHash: string;

  @Column({ nullable: true, type: 'varchar'})
  nickname: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar'})
  avatarUrl: string;

  @Column({ name: 'is_trial_active', default: true, type: 'boolean'})
  isTrialActive: boolean;

  @Column({ name: 'trial_expires_at', type: 'timestamp', nullable: true })
  trialExpiresAt: Date;

  @Column({ name: 'is_email_verified', default: false, type: 'boolean'})
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
