import { Test, TestingModule } from '@nestjs/testing';
import { LazerController } from './lazer.controller';
import { LazerService } from './lazer.service';
import { SpotifyService } from './spotify.service';
import { DiscoverService } from './discover.service';
import { ProxyService } from './proxy.service';

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
    getAllTropes:      jest.fn(),
    getTrendingTropes: jest.fn(),
    createTrope:       jest.fn(),
    getWatchingNow:    jest.fn(),
    createCheckIn:     jest.fn(),
    getUserPosts:      jest.fn(),
    pinPost:           jest.fn(),
    deletePost:        jest.fn(),
    deleteComment:     jest.fn(),
    getComments:       jest.fn(),
    searchYouTube:     jest.fn(),
    getChannelVideos:  jest.fn(),
    getNotifications:  jest.fn(),
    markNotificationRead: jest.fn(),
  };

  const spotifyServiceMock = {
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
    getCurrentlyPlaying: jest.fn(),
  };

  const discoverServiceMock = {
    getTrendingAnime: jest.fn(),
    getTrendingMangas: jest.fn(),
    getTrendingGames: jest.fn(),
    getCinemaContent: jest.fn(),
    getWikipediaArticle: jest.fn(),
    searchUniversal: jest.fn(),
    searchSerperWeb: jest.fn(),
    getDetail: jest.fn(),
    getRedditTrends: jest.fn(),
    getAestheticGallery: jest.fn(),
    getTagSuggestions: jest.fn(),
    searchMangaDex: jest.fn(),
    getMangaChapters: jest.fn(),
    getChapterPages: jest.fn(),
  };

  const proxyServiceMock = {
    streamProxy: jest.fn(),
    extractArticle: jest.fn(),
    proxyImage: jest.fn(),
    extractVideo: jest.fn(),
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
        {
          provide:  SpotifyService,
          useValue: spotifyServiceMock,
        },
        {
          provide:  DiscoverService,
          useValue: discoverServiceMock,
        },
        {
          provide:  ProxyService,
          useValue: proxyServiceMock,
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