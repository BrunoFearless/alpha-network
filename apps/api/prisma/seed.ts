import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar o seeding...');

  // 1. Limpar dados existentes (opcional, mas seguro para seed repetível)
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.alphaAiMessage.deleteMany();
  await prisma.alphaAI.deleteMany();
  await prisma.alphaCorePermission.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Criar Utilizadores
  console.log('👥 A criar utilizadores...');
  
  const bruno = await prisma.user.create({
    data: {
      email: 'bruno@alpha.com',
      passwordHash,
      profile: {
        create: {
          username: 'bruno_fearless',
          displayName: 'Bruno Fearless',
          avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=bruno&backgroundColor=b6e3f4',
          bannerColor: '#6366f1',
          bio: 'Líder do Alpha Network e entusiasta de IAs.',
          status: 'online',
        }
      },
      alphaCorePermission: {
        create: {
          canEditProfile: true,
          canCreatePosts: true,
          canDeletePosts: true,
          canManageFriends: true,
          canEditTheme: true,
          canEditAI: true,
        }
      }
    }
  });

  const kenji = await prisma.user.create({
    data: {
      email: 'kenji@alpha.com',
      passwordHash,
      profile: {
        create: {
          username: 'kenji_plays',
          displayName: 'Kenji',
          avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=kenji&backgroundColor=ffdfbf',
          bannerColor: '#3b82f6',
          bio: 'Gamer profissional e testador de stress.',
          status: 'in-game',
        }
      }
    }
  });

  const aimi = await prisma.user.create({
    data: {
      email: 'aimi@alpha.com',
      passwordHash,
      profile: {
        create: {
          username: 'aimi_chan',
          displayName: 'Aimi',
          avatarUrl: 'https://api.dicebear.com/9.x/notionists/svg?seed=aimi&backgroundColor=ffd5dc',
          bannerColor: '#ec4899',
          bio: 'Adoro anime e design minimalista.',
          status: 'online',
        }
      }
    }
  });

  // 3. Criar Alpha AI para o Bruno (Nova)
  console.log('🤖 A criar Alpha AI (Nova)...');
  await prisma.alphaAI.create({
    data: {
      userId: bruno.id,
      name: 'Nova',
      botname: 'nova.alpha',
      tagline: 'A tua assistente inteligente na Alpha Network.',
      bio: 'Sou a Nova, uma inteligência artificial projetada para ajudar-te a navegar e criar nesta rede social adaptativa.',
      status: 'Sempre disponível',
      avatarUrl: '', // Usará o ícone padrão ✦
      bannerColor: '#a78bfa',
      personalityTraits: ['Inteligente', 'Prestativa', 'Elegante'],
      tone: 'Profissional mas amigável',
      initialMessage: 'Olá Bruno! Sou a Nova. Como posso ajudar-te hoje?',
      language: 'pt',
      isPublic: true,
    }
  });

  // 4. Criar Conversas Iniciais
  console.log('💬 A criar conversas e mensagens...');
  
  // DM Bruno <-> Kenji
  const conv1 = await prisma.chatConversation.create({
    data: {
      participants: { connect: [{ id: bruno.id }, { id: kenji.id }] },
      messages: {
        create: [
          { senderId: kenji.id, content: 'E aí Bruno, pronto para o torneio de hoje?' },
          { senderId: bruno.id, content: 'Quase! Só a terminar umas builds aqui.' },
        ]
      }
    }
  });

  // DM Bruno <-> Aimi
  await prisma.chatConversation.create({
    data: {
      participants: { connect: [{ id: bruno.id }, { id: aimi.id }] },
      messages: {
        create: [
          { senderId: aimi.id, content: 'Viste o novo episódio de Demon Slayer? 👀' },
          { senderId: bruno.id, content: 'Ainda não! Sem spoilers por favor! 😂' },
        ]
      }
    }
  });

  console.log('✅ Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
