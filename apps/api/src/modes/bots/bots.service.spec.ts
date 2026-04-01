import { Test } from '@nestjs/testing';
import { BotsService } from './bots.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BotsService', () => {
  let service: BotsService;
  const prisma = {
    channel: { findUnique: jest.fn() },
    serverBot: { findMany: jest.fn() },
    bot: {},
    botCommand: {},
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [BotsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BotsService);
  });

  describe('checkTriggers', () => {
    it('retorna null se o canal não existir', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);
      await expect(service.checkTriggers('ch-1', '!ping')).resolves.toBeNull();
      expect(prisma.serverBot.findMany).not.toHaveBeenCalled();
    });

    it('faz match case-insensitive de prefixo + trigger', async () => {
      prisma.channel.findUnique.mockResolvedValue({ serverId: 'srv-1' });
      prisma.serverBot.findMany.mockResolvedValue([
        {
          bot: {
            id: 'bot-1',
            name: 'TestBot',
            prefix: '!',
            commands: [{ trigger: 'ping', response: 'pong' }],
          },
        },
      ]);
      await expect(service.checkTriggers('ch-1', '  !PING oi  ')).resolves.toEqual({
        botId: 'bot-1',
        botName: 'TestBot',
        response: 'pong',
      });
    });

    it('retorna null se nenhum comando corresponder', async () => {
      prisma.channel.findUnique.mockResolvedValue({ serverId: 'srv-1' });
      prisma.serverBot.findMany.mockResolvedValue([
        {
          bot: {
            id: 'bot-1',
            name: 'B',
            prefix: '!',
            commands: [{ trigger: 'help', response: 'ok' }],
          },
        },
      ]);
      await expect(service.checkTriggers('ch-1', '!other')).resolves.toBeNull();
    });
  });
});
