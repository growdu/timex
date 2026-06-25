import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { License } from '../license/license.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'license_id', nullable: true })
  licenseId: string;

  @ManyToOne(() => License, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'license_id' })
  license: License;

  @Column({ name: 'device_name' })
  deviceName: string;

  @Column({ name: 'device_fingerprint' })
  deviceFingerprint: string;

  @Column({
    name: 'last_active_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActiveAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
