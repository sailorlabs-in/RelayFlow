import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';

export enum GroupPermission {
  MANAGE_GROUP = 'manage_group',
  MANAGE_CHANNELS = 'manage_channels',
  MANAGE_ROLES = 'manage_roles',
  KICK_MEMBERS = 'kick_members',
  SEND_MESSAGES = 'send_messages',
  ATTACH_FILES = 'attach_files',
  INVITE_MEMBERS = 'invite_members',
  DELETE_OTHER_MESSAGES = 'delete_other_messages',
}

@Entity('group_role')
export class GroupRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 7, default: '#7289da' })
  color!: string;

  @Column({ name: 'permissions', type: 'jsonb', nullable: true, default: [] })
  permissions?: string[];

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
