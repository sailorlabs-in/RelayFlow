import { Conversation, ConversationMember, Message } from '@chat-app/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>
  ) {}

  async createConversation(userIds: string[]): Promise<Conversation> {
    const conversation = this.conversationRepository.create();
    const saved = await this.conversationRepository.save(conversation);

    const members = userIds.map((userId) =>
      this.memberRepository.create({
        conversationId: saved.id,
        userId,
      })
    );
    await this.memberRepository.save(members);

    return saved;
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    const memberships = await this.memberRepository.find({ where: { userId } });
    const conversationIds = memberships.map((m) => m.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    return this.conversationRepository.find({ where: { id: In(conversationIds) } });
  }

  async createMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const isMember = await this.memberRepository.findOne({ where: { conversationId, userId: senderId } });
    if (!isMember) {
      throw new NotFoundException('❌ Conversation not found or user is not a member');
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content,
    });

    return this.messageRepository.save(message);
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
