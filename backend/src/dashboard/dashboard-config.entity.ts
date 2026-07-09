import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dashboard_configs')
export class DashboardConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true, type: 'varchar' })
  userId: string;

  @Column({ type: 'jsonb', default: { widgets: [] } })
  config: DashboardLayout;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export interface DashboardWidget {
  type: string;
  visible: boolean;
  order: number;
  size: 'full' | 'half' | 'third';
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}
