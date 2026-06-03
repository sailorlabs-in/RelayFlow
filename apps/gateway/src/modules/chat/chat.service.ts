import { Conversation, ConversationMember, Message, ConversationType } from '@chat-app/database';
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
    // If it is a Direct Message (2 members), verify if a DM already exists between them
    if (userIds.length === 2) {
      const [userA, userB] = userIds;
      
      const membershipsA = await this.memberRepository.find({ where: { userId: userA } });
      const convoIdsA = membershipsA.map((m) => m.conversationId);
      
      if (convoIdsA.length > 0) {
        const commonMemberships = await this.memberRepository.find({
          where: {
            conversationId: In(convoIdsA),
            userId: userB,
          },
        });
        
        for (const membership of commonMemberships) {
          const allMembers = await this.memberRepository.find({
            where: { conversationId: membership.conversationId },
          });
          
          if (allMembers.length === 2) {
            // Existing DM thread discovered; return it directly instead of duplicating
            return this.conversationRepository.findOneOrFail({
              where: { id: membership.conversationId },
            });
          }
        }
      }
    }

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

  async getConversationsForUser(userId: string): Promise<any[]> {
    const memberships = await this.memberRepository.find({ where: { userId } });
    const conversationIds = memberships.map((m) => m.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }

    const conversations = await this.conversationRepository.find({
      where: {
        id: In(conversationIds),
        type: ConversationType.DM,
      },
    });
    
    // Fetch all memberships for these conversation IDs to resolve participant details instantly
    const allMemberships = await this.memberRepository.find({
      where: { conversationId: In(conversationIds) },
    });

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (convo) => {
        const members = allMemberships.filter((m) => m.conversationId === convo.id);
        const lastMessage = await this.messageRepository.findOne({
          where: { conversationId: convo.id },
          order: { createdAt: 'DESC' },
        });

        return {
          ...convo,
          members: members.map((m) => ({ userId: m.userId, role: m.role })),
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            conversationId: lastMessage.conversationId,
            senderId: lastMessage.senderId,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt.toISOString(),
            updatedAt: lastMessage.updatedAt.toISOString(),
          } : null,
        };
      })
    );

    return conversationsWithDetails;
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    return this.memberRepository.find({ where: { conversationId } });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // 1. Wipe message archives
    await this.messageRepository.delete({ conversationId });
    
    // 2. Wipe memberships
    await this.memberRepository.delete({ conversationId });
    
    // 3. Wipe conversation record
    await this.conversationRepository.delete({ id: conversationId });
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

  async getMessage(messageId: string): Promise<Message | null> {
    return this.messageRepository.findOne({ where: { id: messageId } });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.messageRepository.delete({ id: messageId });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({ where: { id } });
  }
}
