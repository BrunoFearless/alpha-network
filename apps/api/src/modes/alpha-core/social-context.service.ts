// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/modes/alpha-core/social-context.service.ts
// Contexto social completo injectado no system prompt da IA pessoal
// ════════════════════════════════════════════════════════════════════════════

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Constrói um bloco de contexto social completo para o utilizador.
   * Usado no system prompt da IA pessoal a cada conversa.
   */
  async getSocialContext(userId: string): Promise<string> {
    const [
      friendships,
      pendingReceived,
      pendingSent,
      myPosts,
      conversations,
      trendingTropes,
    ] = await Promise.all([
      // 1. Amigos aceites
      this.prisma.friendship.findMany({
        where: {
          OR: [{ userId }, { friendId: userId }],
          status: 'accepted',
        },
        include: {
          user: { include: { profile: true } },
          friend: { include: { profile: true } },
        },
      }),

      // 2. Pedidos de amizade recebidos (pendentes)
      this.prisma.friendship.findMany({
        where: { friendId: userId, status: 'pending' },
        include: {
          user: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 3. Pedidos de amizade enviados (pendentes)
      this.prisma.friendship.findMany({
        where: { userId, status: 'pending' },
        include: {
          friend: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 4. Meus posts recentes com reações e comentários
      this.prisma.lazerPost.findMany({
        where: { authorId: userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          reactions: {
            include: {
              user: { include: { profile: { select: { displayName: true, username: true } } } },
            },
          },
          comments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: {
              author: { include: { profile: { select: { displayName: true, username: true } } } },
            },
          },
        },
      }),

      // 5. Conversas privadas recentes com últimas mensagens
      this.prisma.chatConversation.findMany({
        where: {
          participants: { some: { id: userId } },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 8,
        include: {
          participants: {
            where: { id: { not: userId } },
            select: {
              id: true,
              profile: {
                select: { username: true, displayName: true, status: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              sender: {
                select: {
                  id: true,
                  profile: { select: { username: true, displayName: true } },
                },
              },
              reactions: true,
            },
          },
        },
      }),

      // 6. Tendências actuais
      this.prisma.lazerTrope.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // ── Formatar amigos ──────────────────────────────────────────────────────
    const friends = friendships.map((f) => {
      const other = f.userId === userId ? f.friend : f.user;
      const name = other.profile?.displayName || other.profile?.username || 'Utilizador';
      const status = other.profile?.status || 'Offline';
      const username = other.profile?.username || '';
      return { id: other.id, name, username, status };
    });

    const friendsList =
      friends.length > 0
        ? friends.map((f) => `- ${f.name} (@${f.username}) — ${f.status}`).join('\n')
        : 'Ainda não tens amigos na rede.';

    // ── Pedidos recebidos ────────────────────────────────────────────────────
    const receivedList =
      pendingReceived.length > 0
        ? pendingReceived
            .map((f) => {
              const name = f.user.profile?.displayName || f.user.profile?.username || 'Alguém';
              const username = f.user.profile?.username || '';
              return `- ${name} (@${username}) [friendshipId: ${f.id}]`;
            })
            .join('\n')
        : 'Nenhum pedido recebido.';

    // ── Pedidos enviados ─────────────────────────────────────────────────────
    const sentList =
      pendingSent.length > 0
        ? pendingSent
            .map((f) => {
              const name = f.friend.profile?.displayName || f.friend.profile?.username || 'Alguém';
              const username = f.friend.profile?.username || '';
              return `- ${name} (@${username}) — a aguardar resposta`;
            })
            .join('\n')
        : 'Nenhum pedido enviado pendente.';

    // ── Meus posts ───────────────────────────────────────────────────────────
    const postsSummary =
      myPosts.length > 0
        ? myPosts
            .map((p) => {
              const preview = p.content.substring(0, 80) + (p.content.length > 80 ? '...' : '');
              const reactionCount = p.reactions.length;
              // Group reactions by type
              const reactionsByType: Record<string, number> = {};
              for (const r of p.reactions) {
                reactionsByType[r.type] = (reactionsByType[r.type] || 0) + 1;
              }
              const reactionsStr =
                Object.entries(reactionsByType)
                  .map(([type, count]) => `${count}x ${type}`)
                  .join(', ') || '0 reações';

              const commentCount = p.comments.length;
              const recentComments =
                p.comments.length > 0
                  ? p.comments
                      .map((c) => {
                        const commenter =
                          c.author.profile?.displayName || c.author.profile?.username || '?';
                        return `    • ${commenter}: "${c.content.substring(0, 60)}"`;
                      })
                      .join('\n')
                  : '';

              return (
                `- [postId: ${p.id}] "${preview}"\n` +
                `  Reações: ${reactionsStr} | Comentários: ${commentCount}` +
                (recentComments ? `\n  Últimos comentários:\n${recentComments}` : '')
              );
            })
            .join('\n\n')
        : 'Ainda não publicaste nada.';

    // ── Conversas DM ─────────────────────────────────────────────────────────
    const convosSummary =
      conversations.length > 0
        ? conversations
            .map((conv) => {
              const otherParticipants = conv.participants;
              const names =
                otherParticipants.length > 0
                  ? otherParticipants
                      .map((p) => p.profile?.displayName || p.profile?.username || '?')
                      .join(', ')
                  : conv.name || 'Grupo';

              // Count unread (messages not sent by me with no readAt)
              const unread = conv.messages.filter(
                (m) => m.sender.id !== userId && !m.readAt,
              ).length;

              // Format recent messages
              const recentMsgs = conv.messages
                .slice()
                .reverse() // oldest first for readability
                .map((m) => {
                  const senderName =
                    m.sender.id === userId
                      ? 'Tu'
                      : m.sender.profile?.displayName || m.sender.profile?.username || '?';
                  const reactionsSummary =
                    m.reactions.length > 0
                      ? ` [${m.reactions.map((r) => r.emoji).join('')}]`
                      : '';
                  return `    ${senderName}: "${m.content.substring(0, 70)}"${reactionsSummary}`;
                })
                .join('\n');

              return (
                `- Conversa com ${names}` +
                (unread > 0 ? ` [${unread} não lida${unread !== 1 ? 's' : ''}]` : '') +
                `\n  [conversationId: ${conv.id}]\n` +
                (recentMsgs ? `  Mensagens recentes:\n${recentMsgs}` : '')
              );
            })
            .join('\n\n')
        : 'Nenhuma conversa activa.';

    // ── Tendências ───────────────────────────────────────────────────────────
    const tropesSummary =
      trendingTropes.length > 0
        ? trendingTropes.map((t) => `${t.iconEmoji} #${t.name}`).join('  ')
        : 'Sem tendências no momento.';

    // ── Posts recentes dos amigos ─────────────────────────────────────────
    const friendIds = friends.map((f) => f.id);
    let friendPostsSummary = 'Nenhuma publicação recente dos amigos.';
    if (friendIds.length > 0) {
      const friendPosts = await this.prisma.lazerPost.findMany({
        where: { authorId: { in: friendIds }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          author: { include: { profile: true } },
          reactions: true,
          comments: { where: { deletedAt: null } },
        },
      });
      if (friendPosts.length > 0) {
        friendPostsSummary = friendPosts
          .map((p) => {
            const author =
              p.author.profile?.displayName || p.author.profile?.username || '?';
            const preview = p.content.substring(0, 70) + (p.content.length > 70 ? '...' : '');
            return `- ${author}: "${preview}" (${p.reactions.length} reações, ${p.comments.length} comentários)`;
          })
          .join('\n');
      }
    }

    // ── Montar bloco final ───────────────────────────────────────────────────
    return `
### CONTEXTO SOCIAL — ALPHA NETWORK
> Este é o estado actual da tua rede. Usa estes dados para responder de forma contextualizada.
> Os IDs entre [ ] são usados para executar acções. Nunca os exponhas directamente na conversa.

## Os teus Amigos (${friends.length})
${friendsList}

## Pedidos de Amizade Recebidos (${pendingReceived.length})
${receivedList}

## Pedidos de Amizade Enviados (${pendingSent.length})
${sentList}

## As tuas Publicações Recentes
${postsSummary}

## Publicações Recentes dos Amigos
${friendPostsSummary}

## As tuas Conversas Privadas
${convosSummary}

## Tendências Actuais
${tropesSummary}
`.trim();
  }
}
