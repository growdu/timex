import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Device } from '../devices/device.entity';
import { PlanType, LicenseStatus } from './license.enums';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar'})
  userId: string;

  @ManyToOne(() => User, (user) => user.licenses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'license_key', unique: true, type: 'varchar'})
  licenseKey: string;

  @Column({ name: 'plan_type', type: 'enum', enum: PlanType })
  planType: PlanType;

  @Column({ type: 'enum', enum: LicenseStatus, default: LicenseStatus.ACTIVE })
  status: LicenseStatus;

  @Column({ name: 'device_limit', default: 3, type: 'int'})
  deviceLimit: number;

  @Column({ name: 'purchased_at', type: 'timestamp', nullable: true })
  purchasedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];
}
