import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConversationType {
  DM = 'dm',
  GROUP = 'group',
  CHANNEL = 'channel',
}

@Entity('conversation')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DM,
  })
  type!: ConversationType;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId?: string;

  @Column({ name: 'layout', type: 'varchar', length: 20, default: 'text' })
  layout!: 'text' | 'bubble';

  @Column({ name: 'allowed_role_ids', type: 'jsonb', nullable: true, default: [] })
  allowedRoleIds?: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
