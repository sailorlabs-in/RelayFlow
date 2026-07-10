import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GroupSection } from './group-section.entity';

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
  layout!: 'text' | 'bubble' | 'voice';

  @Column({
    name: 'allowed_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  allowedRoleIds?: string[];

  @Column({
    name: 'read_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  readRoleIds?: string[];

  @Column({
    name: 'write_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  writeRoleIds?: string[];

  @Column({
    name: 'hidden_from_user_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  hiddenFromUserIds?: string[];

  @Column({
    name: 'hidden_from_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  hiddenFromRoleIds?: string[];

  @Column({
    name: 'read_user_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  readUserIds?: string[];

  @Column({
    name: 'write_user_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  writeUserIds?: string[];

  @Column({
    name: 'deny_write_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  denyWriteRoleIds?: string[];

  @Column({
    name: 'deny_write_user_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  denyWriteUserIds?: string[];

  @Column({ name: 'section_id', type: 'uuid', nullable: true })
  sectionId?: string;

  @Column({ name: 'is_read_only', type: 'boolean', default: false })
  isReadOnly!: boolean;

  @Column({
    name: 'notification_setting',
    type: 'varchar',
    length: 20,
    default: 'all',
  })
  notificationSetting!: 'all' | 'mention' | 'none';

  @ManyToOne(() => GroupSection, (section) => section.conversations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'section_id' })
  section?: GroupSection;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
