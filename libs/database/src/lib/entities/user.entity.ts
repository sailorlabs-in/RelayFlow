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

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'avatar_thumbnail_url', nullable: true })
  avatarThumbnailUrl?: string;

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

  @Column({ name: 'notifications_friend_request_enabled', default: true })
  notificationsFriendRequestEnabled!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'verification_otp', nullable: true })
  verificationOtp?: string;

  @Column({
    name: 'verification_otp_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  verificationOtpExpiresAt?: Date;

  @Column({ name: 'is_two_factor_enabled', default: false })
  isTwoFactorEnabled!: boolean;

  @Column({ name: 'two_factor_only_new_device', default: false })
  twoFactorOnlyNewDevice!: boolean;

  @Column({ name: 'two_factor_otp', nullable: true })
  twoFactorOtp?: string;

  @Column({
    name: 'two_factor_otp_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  twoFactorOtpExpiresAt?: Date;

  @Column({ name: 'remembered_devices', type: 'text', nullable: true })
  rememberedDevices?: string;

  @Column({ name: 'reset_password_token', nullable: true })
  resetPasswordToken?: string;

  @Column({
    name: 'reset_password_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  resetPasswordExpiresAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
