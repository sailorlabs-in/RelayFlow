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
import { ApiProperty } from '@nestjs/swagger';
import { Group } from './group.entity';
import { Conversation } from './conversation.entity';

@Entity('group_section')
export class GroupSection {
  @ApiProperty({ example: '56568887-b39d-4912-abeb-3c7d1457b7a9' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: '56568887-b39d-4912-abeb-3c7d1457b7a9' })
  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;

  @ApiProperty({ example: 'DAILY TALKS' })
  @Column({ length: 100 })
  name!: string;

  @ApiProperty({ example: 0 })
  @Column({ type: 'integer', default: 0 })
  position!: number;

  @ApiProperty({
    type: [String],
    example: ['56568887-b39d-4912-abeb-3c7d1457b7a9'],
  })
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
