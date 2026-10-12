import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 用户人脸参考向量：每位 user 一组用于人脸识别的参考照片。
 * 每个 (user_id, source_url) 唯一；embedding 维度固定 512。
 */
@Entity('user_face_embeddings')
@Index(['userId', 'isEnabled'])
@Index(['userId', 'sourceUrl'], { unique: true })
export class UserFaceEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'source_url', type: 'text' })
  sourceUrl!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bbox!: { x: number; y: number; w: number; h: number } | null;

  @Column({ type: 'vector', length: 512 })
  embedding!: number[];

  @Column({ type: 'varchar', length: 32, default: 'mock' })
  provider!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  model!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
