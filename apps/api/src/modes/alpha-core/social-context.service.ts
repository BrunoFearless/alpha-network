import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém um resumo do contexto social para o utilizador.
   * Amigos online, posts recentes e tendências.
   */
  async getSocialContext(userId: string) {
    // 1. Obter amigos (Perfis completos)
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'accepted',
      },
      include: {
        user: { include: { profile: true } },
        friend: { include: { profile: true } },
      }
    });

    const friends = friendships.map(f => {
      const friendUser = f.userId === userId ? f.friend : f.user;
      return {
        id: friendUser.id,
        name: friendUser.profile?.displayName || friendUser.profile?.username || 'Utilizador',
        status: friendUser.profile?.status || 'Offline',
      };
    });

    const friendIds = friends.map(f => f.id);

    // 2. Obter posts recentes dos amigos
    const recentFriendPosts = await this.prisma.lazerPost.findMany({
      where: {
        authorId: { in: friendIds },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { author: { include: { profile: true } } },
    });

    // 3. Obter tendências
    const trendingTropes = await this.prisma.lazerTrope.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // 4. Formatar o resumo
    const friendsList = friends.map(f => `- ${f.name} (${f.status})`).join('\n');
    
    const postsSummary = recentFriendPosts.map(p => 
      `- ${p.author.profile?.displayName || p.author.profile?.username} publicou: "${p.content.substring(0, 50)}..."`
    ).join('\n');

    const tropesSummary = trendingTropes.map(t => `#${t.name}`).join(', ');

    return `
### CONTEXTO SOCIAL (ALPHA NETWORK)
Teus Amigos (${friends.length}):
${friendsList || 'Ainda não tens amigos na rede.'}

Publicações recentes dos amigos:
${postsSummary || 'Nenhuma publicação recente dos amigos.'}

Tendências Actuais: ${tropesSummary || 'Sem tendências no momento.'}
`.trim();
  }
}
