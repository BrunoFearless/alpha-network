const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allUsers = await prisma.user.findMany({ include: { profile: true } });
  console.log('ALL USERS:');
  allUsers.forEach(u => console.log(`ID: ${u.id}, DeletedAt: ${u.deletedAt}, Username: ${u.profile?.username}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
