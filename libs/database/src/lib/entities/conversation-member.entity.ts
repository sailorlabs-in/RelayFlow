import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('conversation_member')
@Unique(['conversationId', 'userId'])
export class ConversationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Conversation;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ default: 'member' })
  role!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
