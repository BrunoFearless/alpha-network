import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const ais = await prisma.alphaAI.findMany({
    include: { user: { select: { email: true } } }
  });
  console.log(JSON.stringify(ais, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
