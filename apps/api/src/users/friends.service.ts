import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

 
@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' },
        ],
      },
      include: {
        user: { include: { profile: true } },
        friend: { include: { profile: true } },
      },
    });

    return friendships
      .map(f => {
        const other = f.userId === userId ? f.friend : f.user;
        return {
          id: other.id,
          userId: other.id,
          profile: other.profile,
          _deletedAt: other.deletedAt,
        };
      })
      // Excluir utilizadores com soft-delete
      .filter(f => !f._deletedAt)
      .map(({ _deletedAt, ...rest }) => rest);
  }

  async getRequests(userId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'pending' },
          { friendId: userId, status: 'pending' },
        ],
      },
      include: {
        user: { include: { profile: true } },
        friend: { include: { profile: true } },
      },
    });

    return requests
      // Excluir pedidos onde qualquer um dos utilizadores foi soft-deleted
      .filter(r => !r.user.deletedAt && !r.friend.deletedAt)
      .map(r => ({
        id: r.id,
        fromUserId: r.userId,
        toUserId: r.friendId,
        status: r.status,
        fromUser: { id: r.user.id, profile: r.user.profile },
        toUser: { id: r.friend.id, profile: r.friend.profile },
        createdAt: r.createdAt,
      }));
  }

  async send(fromId: string, toId: string) {
    if (fromId === toId) throw new BadRequestException('Não podes adicionar-te a ti mesmo.');

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: fromId, friendId: toId },
          { userId: toId, friendId: fromId },
        ],
      },
    });
    if (existing) throw new ConflictException('Relação já existe.');

    return this.prisma.friendship.create({
      data: { userId: fromId, friendId: toId, status: 'pending' },
    });
  }

  async cancel(userId: string, toUserId: string) {
    const req = await this.prisma.friendship.findFirst({
      where: { userId, friendId: toUserId, status: 'pending' },
    });
    if (!req) throw new NotFoundException('Pedido não encontrado.');
    await this.prisma.friendship.delete({ where: { id: req.id } });
    return { ok: true };
  }

  async accept(userId: string, requestId: string) {
    const req = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!req || req.friendId !== userId) throw new NotFoundException('Pedido não encontrado.');
    return this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    });
  }

  async reject(userId: string, requestId: string) {
    const req = await this.prisma.friendship.findUnique({ where: { id: requestId } });
    if (!req || req.friendId !== userId) throw new NotFoundException('Pedido não encontrado.');
    await this.prisma.friendship.delete({ where: { id: requestId } });
    return { ok: true };
  }

  async remove(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'accepted' },
          { userId: friendId, friendId: userId, status: 'accepted' },
        ],
      },
    });
    if (!friendship) throw new NotFoundException('Amizade não encontrada.');
    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { ok: true };
  }

  async getSuggestions(userId: string, limit = 20) {
    const relationships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      select: { userId: true, friendId: true },
    });

    const connectedUserIds = new Set<string>();
    connectedUserIds.add(userId);
    relationships.forEach(r => {
      connectedUserIds.add(r.userId);
      connectedUserIds.add(r.friendId);
    });

    return this.prisma.profile.findMany({
      where: {
        userId: { notIn: Array.from(connectedUserIds) },
        user: { deletedAt: null },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true } } },
    });
  }
}