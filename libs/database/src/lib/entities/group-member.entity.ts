import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from './user.entity';

export enum GroupMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('group_member')
@Unique(['groupId', 'userId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: GroupMemberRole,
    default: GroupMemberRole.MEMBER,
  })
  role!: GroupMemberRole;

  @Column({ name: 'role_ids', type: 'jsonb', nullable: true, default: [] })
  roleIds?: string[];

  @Column({ name: 'permissions', type: 'jsonb', nullable: true, default: [] })
  permissions?: string[];

  @Column({ name: 'is_muted', type: 'boolean', default: false })
  isMuted!: boolean;

  @Column({
    name: 'notification_pref',
    type: 'varchar',
    length: 20,
    default: 'all',
  })
  notificationPref!: 'all' | 'mention' | 'none';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
