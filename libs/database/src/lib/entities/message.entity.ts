import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl?: string;

  @Column({ name: 'media_type', type: 'varchar', length: 100, nullable: true })
  mediaType?: string;

  @Column({ name: 'media_name', type: 'varchar', length: 255, nullable: true })
  mediaName?: string;

  @Column({ name: 'media_size', type: 'integer', nullable: true })
  mediaSize?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
