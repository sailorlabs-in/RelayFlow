import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ example: '56568887-b39d-4912-abeb-3c7d1457b7a9' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: '56568887-b39d-4912-abeb-3c7d1457b7a9' })
  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @ApiProperty({ example: 'Moderator' })
  @Column({ length: 100 })
  name!: string;

  @ApiProperty({ example: '#7289da' })
  @Column({ length: 7, default: '#7289da' })
  color!: string;

  @ApiProperty({
    type: [String],
    example: ['manage_channels', 'send_messages'],
  })
  @Column({ name: 'permissions', type: 'jsonb', nullable: true, default: [] })
  permissions?: string[];

  @ApiProperty({ example: 1 })
  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'color_priority', type: 'int', default: 0 })
  colorPriority!: number;

  @ApiProperty({ example: 0 })
  @Column({ name: 'hierarchy_priority', type: 'int', default: 0 })
  hierarchyPriority!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
