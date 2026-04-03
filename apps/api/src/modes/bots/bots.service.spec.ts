import { Test } from '@nestjs/testing';
import { BotsService } from './bots.service';
import { BotEngineService } from './bot-engine.service';
import { BotExecutionLogService } from './bot-execution-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityService } from '../community/community.service';

describe('BotsService', () => {
  let service: BotsService;
  const prisma = {
    channel: { findUnique: jest.fn() },
    serverBot: { findMany: jest.fn() },
    bot: {},
    botCommand: {},
  };

  const community = {
    formatMembersListForBot: jest.fn().mockResolvedValue('**Membros (0)**\n'),
    assertActorCanModerate: jest.fn().mockResolvedValue(undefined),
    muteMember: jest.fn(),
    unmuteMember: jest.fn(),
    kickMember: jest.fn(),
    banMember: jest.fn(),
    unbanMember: jest.fn(),
    updateServer: jest.fn(),
  };

  const engine = { evaluateMessageCreate: jest.fn().mockResolvedValue(null) };
  const executionLogs = { listForOwner: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BotsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunityService, useValue: community },
        { provide: BotEngineService, useValue: engine },
        { provide: BotExecutionLogService, useValue: executionLogs },
      ],
    }).compile();
    service = moduleRef.get(BotsService);
  });

  describe('checkTriggers', () => {
    it('retorna null se o canal não existir', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);
      await expect(service.checkTriggers('ch-1', '!ping', 'user-1')).resolves.toBeNull();
      expect(prisma.serverBot.findMany).not.toHaveBeenCalled();
    });

    it('faz match case-insensitive de prefixo + trigger', async () => {
      prisma.channel.findUnique.mockResolvedValue({ serverId: 'srv-1' });
      prisma.serverBot.findMany.mockResolvedValue([
        {
          isAdminBot: false,
          bot: {
            id: 'bot-1',
            name: 'TestBot',
            prefix: '!',
            commands: [{ trigger: 'ping', response: 'pong', responseType: 'text', imageUrl: null, embedJson: null }],
          },
        },
      ]);
      await expect(service.checkTriggers('ch-1', '  !PING oi  ', 'user-1')).resolves.toMatchObject({
        botId: 'bot-1',
        content: 'pong',
        messageType: 'text',
      });
    });

    it('retorna null se nenhum comando corresponder', async () => {
      prisma.channel.findUnique.mockResolvedValue({ serverId: 'srv-1' });
      prisma.serverBot.findMany.mockResolvedValue([
        {
          isAdminBot: false,
          bot: {
            id: 'bot-1',
            name: 'B',
            prefix: '!',
            commands: [{ trigger: 'help', response: 'ok', responseType: 'text', imageUrl: null, embedJson: null }],
          },
        },
      ]);
      await expect(service.checkTriggers('ch-1', '!other', 'user-1')).resolves.toBeNull();
    });
  });
});
