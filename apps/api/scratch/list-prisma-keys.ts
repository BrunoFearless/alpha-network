import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const keys = Object.keys(prisma);
  console.log('Available Prisma properties:', keys.filter(k => !k.startsWith('_')));
}
main().catch(console.error).finally(() => prisma.$disconnect());
