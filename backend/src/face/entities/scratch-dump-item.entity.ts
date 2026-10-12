import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ScratchDump } from './scratch-dump.entity';

/**
 * scratch dump 内单张照片 + 人脸：每张照片对应一条记录。
 * 每个 (dump_id, source_url) 唯一；embedding 维度固定 512（向量建在 is_processed = TRUE 的子集上）。
 */
@Entity('scratch_dump_items')
@Index(['dumpId'])
@Index(['userId', 'dumpId'])
@Index(['dumpId', 'takenAt'])
@Index(['userId', 'dumpId', 'sourceUrl'], { unique: true })
export class ScratchDumpItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'dump_id', type: 'uuid' })
  dumpId!: string;

  @ManyToOne(() => ScratchDump, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dump_id' })
  dump?: ScratchDump;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename!: string | null;

  @Column({ name: 'taken_at', type: 'timestamp', nullable: true })
  takenAt!: Date | null;

  @Column({ name: 'file_mtime', type: 'timestamp', nullable: true })
  fileMtime!: Date | null;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bbox!: { x: number; y: number; w: number; h: number } | null;

  @Column({ type: 'vector', length: 512, nullable: true })
  embedding!: number[] | null;

  @Column({ type: 'varchar', length: 32, default: 'mock' })
  provider!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  model!: string | null;

  @Column({ name: 'quality_score', type: 'real', nullable: true })
  qualityScore!: number | null;

  @Column({ name: 'is_processed', type: 'boolean', default: false })
  isProcessed!: boolean;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
