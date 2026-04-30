const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const bruno = await prisma.user.findFirst({ where: { profile: { username: 'bruno_fearless' } } });
  if (!bruno) return console.log('Bruno not found');
  
  // Same logic as getSuggestions
  const relationships = await prisma.friendship.findMany({
    where: { OR: [{ userId: bruno.id }, { friendId: bruno.id }] },
    select: { userId: true, friendId: true },
  });

  const connectedUserIds = new Set();
  connectedUserIds.add(bruno.id);
  relationships.forEach(r => {
    connectedUserIds.add(r.userId);
    connectedUserIds.add(r.friendId);
  });

  const suggestions = await prisma.profile.findMany({
    where: {
      userId: { notIn: Array.from(connectedUserIds) },
      user: { deletedAt: null },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, deletedAt: true } } },
  });

  console.log('Suggestions for bruno_fearless:');
  suggestions.forEach(s => {
    console.log(`Username: ${s.username}, DeletedAt: ${s.user.deletedAt}, ID: ${s.userId}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
