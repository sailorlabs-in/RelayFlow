import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Group } from './group.entity';
import { Conversation } from './conversation.entity';

@Entity('group_section')
export class GroupSection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'integer', default: 0 })
  position!: number;

  @Column({
    name: 'allowed_role_ids',
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  allowedRoleIds?: string[];

  @OneToMany(() => Conversation, (conversation) => conversation.section)
  conversations?: Conversation[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
