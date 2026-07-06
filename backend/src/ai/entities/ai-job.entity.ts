import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AiJobKind =
  | 'image-tag'
  | 'image-summary'
  | 'audio-transcribe'
  | 'memoir-summary'
  | 'chapter-summary'
  | 'event-summary';

export type AiJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type AiJobTargetType = 'moment' | 'memoir' | 'chapter' | 'event';

@Entity('ai_jobs')
@Index(['userId', 'status'])
@Index(['userId', 'targetType', 'targetId'])
export class AiJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ name: 'kind', type: 'varchar' })
  kind!: AiJobKind;

  @Column({ name: 'target_type', type: 'varchar' })
  targetType!: AiJobTargetType;

  @Column({ name: 'target_id', type: 'varchar' })
  targetId!: string;

  @Column({ name: 'status', type: 'varchar', default: 'queued' })
  status!: AiJobStatus;

  @Column({ name: 'provider', type: 'varchar', nullable: true })
  provider?: string | null;

  @Column({ name: 'model', type: 'varchar', nullable: true })
  model?: string | null;

  @Column({ name: 'output', type: 'text', nullable: true })
  output?: string | null;

  @Column({ name: 'structured', type: 'jsonb', nullable: true })
  structured?: Record<string, unknown> | null;

  @Column({ name: 'error', type: 'text', nullable: true })
  error?: string | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
