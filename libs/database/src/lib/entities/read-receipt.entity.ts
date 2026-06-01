import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('read_receipt')
export class ReadReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'read_at', type: 'timestamptz' })
  readAt!: Date;
}
