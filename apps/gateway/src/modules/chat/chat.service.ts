import {
  Conversation,
  ConversationMember,
  Message,
  ConversationType,
} from '@chat-app/database';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';

import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly usersService: UsersService,
  ) {}

  async createConversation(userIds: string[]): Promise<Conversation> {
    // If it is a Direct Message (2 members), verify if a DM already exists between them
    if (userIds.length === 2) {
      const [userA, userB] = userIds;

      const isFriend = await this.usersService.isFriend(userA, userB);
      if (!isFriend) {
        throw new ForbiddenException(
          '❌ You can only start DM conversations with accepted friends.',
        );
      }

      const membershipsA = await this.memberRepository.find({
        where: { userId: userA },
      });
      const convoIdsA = membershipsA.map((m) => m.conversationId);

      if (convoIdsA.length > 0) {
        const commonMemberships = await this.memberRepository.find({
          where: {
            conversationId: In(convoIdsA),
            userId: userB,
          },
        });

        for (const membership of commonMemberships) {
          const convo = await this.conversationRepository.findOne({
            where: { id: membership.conversationId, type: ConversationType.DM },
          });

          if (convo) {
            const allMembers = await this.memberRepository.find({
              where: { conversationId: membership.conversationId },
            });

            if (allMembers.length === 2) {
              // Existing DM thread discovered; return it directly instead of duplicating
              return convo;
            }
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
      }),
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
        const members = allMemberships.filter(
          (m) => m.conversationId === convo.id,
        );
        const lastMessage = await this.messageRepository.findOne({
          where: { conversationId: convo.id },
          order: { createdAt: 'DESC' },
        });

        return {
          ...convo,
          members: members.map((m) => ({ userId: m.userId, role: m.role })),
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                conversationId: lastMessage.conversationId,
                senderId: lastMessage.senderId,
                content: lastMessage.content,
                isRead: lastMessage.isRead,
                createdAt: lastMessage.createdAt.toISOString(),
                updatedAt: lastMessage.updatedAt.toISOString(),
                mediaUrl: lastMessage.mediaUrl,
                mediaType: lastMessage.mediaType,
                mediaName: lastMessage.mediaName,
                mediaSize: lastMessage.mediaSize,
              }
            : null,
        };
      }),
    );

    return conversationsWithDetails;
  }

  async getConversationMembers(
    conversationId: string,
  ): Promise<ConversationMember[]> {
    return this.memberRepository.find({ where: { conversationId } });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // 1. Fetch messages with media first
    try {
      const messagesWithMedia = await this.messageRepository.find({
        where: {
          conversationId,
          mediaUrl: Not(IsNull()),
        },
        select: ['mediaUrl'],
      });

      const bucketUrl = (
        process.env.BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const prefix = `${bucketUrl}/storage/`;

      const mediaToClean: { bucket: string; name: string }[] = [];
      for (const msg of messagesWithMedia) {
        if (msg.mediaUrl && msg.mediaUrl.startsWith(prefix)) {
          const path = msg.mediaUrl.slice(prefix.length);
          const parts = path.split('/');
          if (parts.length >= 2) {
            const bucket = parts[0];
            const name = parts.slice(1).join('/');
            mediaToClean.push({ bucket, name });
          }
        }
      }

      // Group by bucket
      const bucketGroups: { [bucket: string]: string[] } = {};
      for (const item of mediaToClean) {
        if (!bucketGroups[item.bucket]) {
          bucketGroups[item.bucket] = [];
        }
        bucketGroups[item.bucket].push(item.name);
      }

      // Call delete in batches of 20
      for (const [bucket, names] of Object.entries(bucketGroups)) {
        for (let i = 0; i < names.length; i += 20) {
          const batch = names.slice(i, i + 20);
          await fetch(`${bucketUrl}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bucket,
              names: batch,
            }),
          });
        }
      }
    } catch (err) {
      console.error('Failed to batch clean conversation media:', err);
    }

    // 2. Wipe message archives
    await this.messageRepository.delete({ conversationId });

    // 3. Wipe memberships
    await this.memberRepository.delete({ conversationId });

    // 4. Wipe conversation record
    await this.conversationRepository.delete({ id: conversationId });
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    isRead = false,
    mediaUrl?: string,
    mediaType?: string,
    mediaName?: string,
    mediaSize?: number,
  ): Promise<Message> {
    const isMember = await this.memberRepository.findOne({
      where: { conversationId, userId: senderId },
    });
    if (!isMember) {
      throw new NotFoundException(
        '❌ Conversation not found or user is not a member',
      );
    }

    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content,
      isRead,
      mediaUrl,
      mediaType,
      mediaName,
      mediaSize,
    });

    return this.messageRepository.save(message);
  }

  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.messageRepository.update(
      { conversationId, senderId: Not(userId), isRead: false },
      { isRead: true },
    );
  }

  async getMessages(
    conversationId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
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
    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
      });
      if (message && message.mediaUrl) {
        await this.deleteMediaFile(message.mediaUrl);
      }
    } catch (err) {
      console.error('Failed to clean single message media:', err);
    }
    await this.messageRepository.delete({ id: messageId });
  }

  private async deleteMediaFile(url: string): Promise<void> {
    if (!url) {
      return;
    }
    try {
      const bucketUrl = (
        process.env.BUCKET_URL || 'https://bucket.umangsailor.com'
      ).replace(/\/+$/, '');
      const prefix = `${bucketUrl}/storage/`;
      if (url.startsWith(prefix)) {
        const path = url.slice(prefix.length);
        const parts = path.split('/');
        if (parts.length >= 2) {
          const bucket = parts[0];
          const name = parts.slice(1).join('/');

          await fetch(`${bucketUrl}/files`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              bucket,
              names: [name],
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to delete media from external storage:', error);
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversationRepository.findOne({ where: { id } });
  }
}
