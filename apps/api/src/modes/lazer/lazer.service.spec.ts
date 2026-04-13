import { Test, TestingModule } from '@nestjs/testing';
import { LazerService } from './lazer.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * CORRIGIDO: o teste anterior tentava instanciar LazerService sem fornecer
 * PrismaService (que é uma dependência obrigatória do construtor).
 * O NestJS lançava erro de injecção e os testes falhavam sempre.
 *
 * Agora usamos um mock com jest.fn() para cada método do Prisma que o serviço
 * usa internamente, evitando qualquer ligação a uma base de dados real.
 */
describe('LazerService', () => {
  let service: LazerService;

  const prismaMock = {
    lazerPost: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    lazerReaction: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
      deleteMany: jest.fn(),
      count:      jest.fn(),
    },
    lazerComment: {
      create:     jest.fn(),
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
      updateMany: jest.fn(),
    },
    profile: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LazerService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<LazerService>(LazerService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('cria um post e devolve os dados com contagens', async () => {
      const mockPost = {
        id: 'post-1',
        authorId: 'user-1',
        content: 'Olá Alpha!',
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        _count: { reactions: 0, comments: 0 },
      };
      prismaMock.lazerPost.create.mockResolvedValue(mockPost);

      const result = await service.createPost({ content: 'Olá Alpha!' }, 'user-1');
      expect(result).toEqual(mockPost);
      expect(prismaMock.lazerPost.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ authorId: 'user-1', content: 'Olá Alpha!' }) }),
      );
    });
  });

  describe('toggleReaction', () => {
    it('adiciona reação quando não existe', async () => {
      prismaMock.lazerPost.findUnique.mockResolvedValue({ id: 'post-1', deletedAt: null });
      prismaMock.lazerReaction.findUnique.mockResolvedValue(null);
      prismaMock.lazerReaction.create.mockResolvedValue({});
      prismaMock.lazerReaction.count.mockResolvedValue(1);

      const result = await service.toggleReaction({ postId: 'post-1' }, 'user-1');
      expect(result.liked).toBe(true);
      expect(result.reactionCount).toBe(1);
    });

    it('remove reação quando já existe', async () => {
      prismaMock.lazerPost.findUnique.mockResolvedValue({ id: 'post-1', deletedAt: null });
      prismaMock.lazerReaction.findUnique.mockResolvedValue({ id: 'r-1' });
      prismaMock.lazerReaction.delete.mockResolvedValue({});
      prismaMock.lazerReaction.count.mockResolvedValue(0);

      const result = await service.toggleReaction({ postId: 'post-1' }, 'user-1');
      expect(result.liked).toBe(false);
      expect(result.reactionCount).toBe(0);
    });
  });

  describe('softDeletePost', () => {
    it('lança ForbiddenException se o utilizador não for o autor', async () => {
      prismaMock.lazerPost.findUnique.mockResolvedValue({ id: 'post-1', authorId: 'outro-user', deletedAt: null });
      await expect(service.softDeletePost('post-1', 'user-1')).rejects.toThrow();
    });

    it('lança NotFoundException se o post não existir', async () => {
      prismaMock.lazerPost.findUnique.mockResolvedValue(null);
      await expect(service.softDeletePost('post-inexistente', 'user-1')).rejects.toThrow();
    });
  });
});