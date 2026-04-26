import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: {
        participants: {
          some: { id: userId },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(conversationId: string, userId: string, limit = 50) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: userId } },
      },
    });

    if (!conv) throw new ForbiddenException('Não tens acesso a esta conversa.');

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        reactions: {
          include: {
            message: false,
          }
        },
      },
    });
  }

  // ... (previous methods)

  async deleteMessage(userId: string, messageId: string) {
    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!msg) throw new NotFoundException('Mensagem não encontrada.');
    if (msg.senderId !== userId) throw new ForbiddenException('Não podes apagar esta mensagem.');

    return this.prisma.chatMessage.delete({ where: { id: messageId } });
  }

  async updateMessage(userId: string, messageId: string, content: string) {
    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!msg) throw new NotFoundException('Mensagem não encontrada.');
    if (msg.senderId !== userId) throw new ForbiddenException('Não podes editar esta mensagem.');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        sender: {
          select: { id: true, profile: { select: { username: true, displayName: true, avatarUrl: true } } }
        },
        reactions: true,
      }
    });
  }

  async togglePinMessage(userId: string, messageId: string) {
    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: true } } }
    });

    if (!msg) throw new NotFoundException('Mensagem não encontrada.');
    const isParticipant = msg.conversation.participants.some(p => p.id === userId);
    if (!isParticipant) throw new ForbiddenException('Não tens permissão.');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: !msg.isPinned },
    });
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const existing = await this.prisma.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji }
      }
    });

    if (existing) {
      await this.prisma.chatMessageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.chatMessageReaction.create({
        data: { messageId, userId, emoji }
      });
    }

    return this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, profile: { select: { username: true, displayName: true, avatarUrl: true } } } },
        reactions: true,
      }
    });
  }

  async createConversation(userId: string, dto: CreateConversationDto) {
    // Ensure the current user is included in participants
    const participantIds = Array.from(new Set([...dto.participantIds, userId]));

    // If it's a DM (2 participants), check if it already exists
    if (!dto.isGroup && participantIds.length === 2) {
      const existing = await this.prisma.chatConversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { id: participantIds[0] } } },
            { participants: { some: { id: participantIds[1] } } },
          ],
        },
        include: {
          participants: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (existing) return existing;
    }

    return this.prisma.chatConversation.create({
      data: {
        name: dto.name,
        isGroup: dto.isGroup ?? false,
        participants: {
          connect: participantIds.map(id => ({ id })),
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: {
        id: dto.conversationId,
        participants: { some: { id: userId } },
      },
    });

    if (!conv) throw new ForbiddenException('Não tens acesso a esta conversa.');

    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          content: dto.content,
          imageUrl: dto.imageUrl,
        },
        include: {
          sender: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.chatConversation.update({
        where: { id: dto.conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    return message;
  }
}
