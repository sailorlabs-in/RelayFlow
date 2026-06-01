import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ConversationType {
  DM = 'dm',
  GROUP = 'group',
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
