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
  themeMode = 'system';

  @Column({ name: 'theme_schema', default: 'arctic_glass' })
  themeSchema = 'arctic_glass';

  @Column({ name: 'status', default: 'online' })
  status = 'online';

  @Column({ name: 'visibility', default: 'everyone' })
  visibility = 'everyone';

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled = true;

  @Column({ name: 'notifications_dm_enabled', default: true })
  notificationsDmEnabled = true;

  @Column({ name: 'notifications_group_enabled', default: true })
  notificationsGroupEnabled = true;

  @Column({ name: 'notifications_in_app_enabled', default: true })
  notificationsInAppEnabled = true;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
