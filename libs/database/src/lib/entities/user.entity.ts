import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'theme_mode', default: 'system' })
  themeMode!: string;

  @Column({ name: 'theme_schema', default: 'arctic_glass' })
  themeSchema!: string;

  @Column({ name: 'status', default: 'online' })
  status!: string;

  @Column({ name: 'visibility', default: 'everyone' })
  visibility!: string;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled!: boolean;

  @Column({ name: 'notifications_dm_enabled', default: true })
  notificationsDmEnabled!: boolean;

  @Column({ name: 'notifications_group_enabled', default: true })
  notificationsGroupEnabled!: boolean;

  @Column({ name: 'notifications_in_app_enabled', default: true })
  notificationsInAppEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
