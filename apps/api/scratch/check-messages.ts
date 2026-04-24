import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // @ts-ignore
  const messages = await prisma.alphaAiMessage.findMany();
  console.log('Total messages in DB:', messages.length);
  console.log(JSON.stringify(messages, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
