import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum ProductType {
  LICENSE = 'license',
  PHOTO_ALBUM = 'photo_album',
  CUSTOM_PRINT = 'custom_print',
  TEMPLATE = 'template',
  DATA_EXPORT = 'data_export',
  AI_PACKAGE = 'ai_package',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar'})
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'order_no', unique: true, type: 'varchar'})
  orderNo: string;

  @Column({ name: 'product_type', type: 'enum', enum: ProductType })
  productType: ProductType;

  @Column({ name: 'product_id', nullable: true, type: 'varchar'})
  productId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'CNY', type: 'varchar'})
  currency: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ nullable: true, type: 'varchar'})
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
