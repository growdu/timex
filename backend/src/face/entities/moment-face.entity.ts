import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Moment } from '../../moments/moment.entity';

/**
 * moment 中识别到的人脸：每次人脸识别产物。
 * 关联 moment（onDelete CASCADE）；embedding 维度固定 512。
 */
@Entity('moment_faces')
@Index(['momentId'])
@Index(['userId', 'momentId'])
export class MomentFace {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'moment_id', type: 'uuid' })
  momentId!: string;

  @ManyToOne(() => Moment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moment_id' })
  moment?: Moment;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ type: 'jsonb', nullable: true })
  bbox!: { x: number; y: number; w: number; h: number } | null;

  @Column({ type: 'vector', length: 512 })
  embedding!: number[];

  @Column({ type: 'varchar', length: 32, default: 'mock' })
  provider!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  model!: string | null;

  @Column({ name: 'quality_score', type: 'real', nullable: true })
  qualityScore!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
