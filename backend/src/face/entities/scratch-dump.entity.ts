import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 临时 scratch dump 元数据：用户上传一批照片做临时检索时建立。
 * 进度计数（total / done / failed / hits）由后台扫描任务更新。
 */
@Entity('scratch_dumps')
@Index(['userId', 'createdAt'])
export class ScratchDump {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status!: string;

  @Column({ name: 'total_items', type: 'int', default: 0 })
  totalItems!: number;

  @Column({ name: 'done_items', type: 'int', default: 0 })
  doneItems!: number;

  @Column({ name: 'failed_items', type: 'int', default: 0 })
  failedItems!: number;

  @Column({ name: 'hits_count', type: 'int', default: 0 })
  hitsCount!: number;

  @Column({ name: 'last_search_at', type: 'timestamp', nullable: true })
  lastSearchAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
