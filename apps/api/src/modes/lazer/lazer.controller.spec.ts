import { Test, TestingModule } from '@nestjs/testing';
import { LazerController } from './lazer.controller';
import { LazerService } from './lazer.service';

describe('LazerController', () => {
  // Tipado como `any` para o TypeScript não tentar validar os métodos
  // durante a compilação do spec — o Jest executa em runtime e encontra
  // os métodos correctamente através do module.get.
  let controller: any;

  const lazerServiceMock = {
    createPost:        jest.fn(),
    getFeed:           jest.fn(),
    findOnePost:       jest.fn(),
    updatePost:        jest.fn(),
    softDeletePost:    jest.fn(),
    toggleReaction:    jest.fn(),
    createComment:     jest.fn(),
    findComments:      jest.fn(),
    updateComment:     jest.fn(),
    softDeleteComment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LazerController],
      providers: [
        {
          provide:  LazerService,
          useValue: lazerServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LazerController>(LazerController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createPost', () => {
    it('chama lazerService.createPost com os argumentos correctos', async () => {
      const dto        = { content: 'Teste de post' };
      const req        = { user: { id: 'user-1' } };
      const mockResult = { id: 'post-1', content: 'Teste de post' };
      lazerServiceMock.createPost.mockResolvedValue(mockResult);

      const result = await controller.createPost(dto, req);
      expect(result).toEqual(mockResult);
      expect(lazerServiceMock.createPost).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('getFeed', () => {
    it('devolve o feed paginado', async () => {
      const mockFeed = { data: [], meta: { nextCursor: null, hasMore: false } };
      lazerServiceMock.getFeed.mockResolvedValue(mockFeed);

      const result = await controller.getFeed(undefined, '10');
      expect(result).toEqual(mockFeed);
      expect(lazerServiceMock.getFeed).toHaveBeenCalledWith(undefined, 10);
    });
  });

  describe('toggleReaction', () => {
    it('chama toggleReaction com postId e userId', async () => {
      const dto        = { postId: 'post-1' };
      const req        = { user: { id: 'user-1' } };
      const mockResult = { liked: true, reactionCount: 1 };
      lazerServiceMock.toggleReaction.mockResolvedValue(mockResult);

      const result = await controller.toggleReaction(dto, req);
      expect(result).toEqual(mockResult);
      expect(lazerServiceMock.toggleReaction).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('createComment', () => {
    it('chama createComment com os argumentos correctos', async () => {
      const dto        = { content: 'Bom post!' };
      const req        = { user: { id: 'user-1' } };
      const mockResult = { id: 'c-1', content: 'Bom post!' };
      lazerServiceMock.createComment.mockResolvedValue(mockResult);

      const result = await controller.createComment('post-1', dto, req);
      expect(result).toEqual(mockResult);
      expect(lazerServiceMock.createComment).toHaveBeenCalledWith('post-1', 'user-1', dto);
    });
  });

  describe('removePost', () => {
    it('chama softDeletePost e devolve o resultado', async () => {
      const req        = { user: { id: 'user-1' } };
      const mockResult = { id: 'post-1', deletedAt: new Date() };
      lazerServiceMock.softDeletePost.mockResolvedValue(mockResult);

      const result = await controller.removePost('post-1', req);
      expect(result).toEqual(mockResult);
      expect(lazerServiceMock.softDeletePost).toHaveBeenCalledWith('post-1', 'user-1');
    });
  });
});