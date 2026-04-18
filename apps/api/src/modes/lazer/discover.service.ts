import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);
  private readonly JIKAN_API = 'https://api.jikan.moe/v4';
  private readonly RAWG_API = 'https://api.rawg.io/api';
  private readonly RAWG_KEY = process.env.RAWG_API_KEY || '';
  private readonly YT_KEY = process.env.YOUTUBE_API_KEY || '';

  constructor() {
    this.logger.log(`DiscoverService initialized. YouTube Key present: ${!!this.YT_KEY}`);
  }

  async getTrendingAnime() {
    try {
      this.logger.log('Fetching trending anime...');
      const res = await fetch(`${this.JIKAN_API}/top/anime?filter=airing&limit=12`);
      const data = await res.json();
      if (!data.data) return { success: true, data: [] };
      return {
        success: true,
        data: data.data.map((item: any) => ({
          id: item.mal_id.toString(),
          type: 'anime',
          title: item.title,
          description: item.synopsis,
          imageUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          rating: item.score,
          genres: item.genres?.map((g: any) => g.name) || [],
          status: item.status,
          year: item.year,
          url: item.url,
          trailer: item.trailer?.embed_url
        })),
      };
    } catch (e) {
      this.logger.error(`Error fetching anime: ${e.message}`);
      return { success: false, error: 'Failed' };
    }
  }

  async getTrendingGames() {
    if (!this.RAWG_KEY) {
      this.logger.warn('RAWG_API_KEY missing. Falling back to YouTube for games trending.');
      return this.fetchYoutube('melhores jogos lançamentos 2024 2025 official trailers gameplay', 'game');
    }
    try {
      const res = await fetch(`${this.RAWG_API}/games?key=${this.RAWG_KEY}&ordering=-added&page_size=12`);
      const data = await res.json();
      return {
        success: true,
        data: (data.results || []).map((item: any) => ({
          id: item.id.toString(),
          type: 'game',
          title: item.name,
          imageUrl: item.background_image,
          rating: item.rating,
          genres: item.genres?.map((g: any) => g.name) || [],
          platforms: item.platforms?.map((p: any) => p.platform.name),
          released: item.released
        })),
      };
    } catch (e) {
      this.logger.error(`Error fetching trending games: ${e.message}`);
      return this.fetchYoutube('melhores jogos lançamentos 2024 2025 official trailers gameplay', 'game');
    }
  }

  async getEducationContent() { return { success: true, data: [] }; }
  async getTrendingTopics() { return { success: true, data: [] }; }
  async getTechNews() { return { success: true, data: [] }; }

  /**
   * Get Trending Mangas
   */
  async getTrendingMangas() {
    try {
      const res = await fetch(`${this.JIKAN_API}/top/manga?filter=publishing&limit=12`);
      const data = await res.json();
      return {
        success: true,
        data: (data.data || []).map((item: any) => ({
          id: item.mal_id.toString(),
          type: 'manga',
          title: item.title,
          description: item.synopsis,
          imageUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          rating: item.score,
          genres: item.genres?.map((g: any) => g.name),
          status: item.status,
          chapters: item.chapters,
          volumes: item.volumes
        })),
      };
    } catch (e) { return { success: false, error: 'Failed' }; }
  }

  /**
   * Get Cinema & Movies (Trailers)
   */
  async getCinemaContent() {
    return this.fetchYoutube('trailers filmes cinema 2024 2025 estreias oficial', 'cinema');
  }

  private async fetchYoutube(q: string, type: string) {
    if (!this.YT_KEY) return { success: false, error: 'API Key missing' };
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${this.YT_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return { success: false, error: data.error.message };
      return {
        success: true,
        data: (data.items || []).map((item: any) => ({
          id: item.id.videoId,
          type: type,
          title: item.snippet.title,
          description: item.snippet.description,
          imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          channel: item.snippet.channelTitle
        }))
      };
    } catch (e) { return { success: false, error: 'Failed' }; }
  }

  /**
   * Get Full Wikipedia Article
   */
  async getWikipediaArticle(title: string) {
    try {
      const normalizedTitle = title.trim().replace(/ /g, '_');
      this.logger.log(`Fetching Wiki Article (Action API Migration): ${normalizedTitle}`);
      
      const [parseRes, queryRes] = await Promise.all([
        fetch(`https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(normalizedTitle)}&prop=text|sections&format=json&noimages=0&mobileformat=1`, {
          headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
        }),
        fetch(`https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(normalizedTitle)}&prop=pageimages|description&format=json&pithumbsize=1000`, {
          headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
        })
      ]);

      const parseData = await parseRes.json();
      const queryData = await queryRes.json();

      if (parseData.error) {
        this.logger.error(`Wiki Parse Error: ${parseData.error.info}`);
        return { success: false, error: 'Artigo não encontrado na enciclopédia.' };
      }

      const pageId = Object.keys(queryData.query.pages)[0];
      const pageInfo = queryData.query.pages[pageId];

      const htmlContent = parseData.parse.text['*'];
      const rawSections = parseData.parse.sections || [];

      // If we have sections, it's a structured article.
      // For compatibility with the previous frontend, we'll return a single main section
      // containing the full HTML, as parsing/splitting MediaWiki HTML is complex.
      // But we will include section headers for the TOC if the frontend uses it.

      return {
        success: true,
        data: {
          title: parseData.parse.title,
          description: pageInfo?.description,
          imageUrl: pageInfo?.thumbnail?.source,
          sections: [
            {
               id: 0,
               title: '', 
               text: htmlContent, 
               level: 1
            }
          ],
          url: `https://pt.wikipedia.org/wiki/${normalizedTitle}`
        }
      };
    } catch (e) {
      this.logger.error(`Failed to fetch wiki article (Migration): ${e.message}`);
      return { success: false, error: 'Erro ao conectar aos servidores da Wikipedia.' };
    }
  }

  /**
   * Search Wikipedia for a summary
   */
  async getWikipediaSummary(query: string) {
    try {
      const cleanQuery = query.toLowerCase()
        .replace(/resumo de /g, '')
        .replace(/quem é /g, '')
        .replace(/o que é /g, '')
        .trim();

      const searchRes = await fetch(`https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=1&namespace=0&format=json`, {
        headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
      });
      const searchData = await searchRes.json();
      
      const title = searchData[1]?.[0];
      if (!title) return null;

      const summaryRes = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
        headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
      });
      const summaryData = await summaryRes.json();

      if (summaryData.type === 'standard' || summaryData.type === 'disambiguation') {
        return {
          title: summaryData.title,
          canonicalTitle: summaryData.titles?.canonical || summaryData.title, // USE THIS!
          extract: summaryData.extract,
          description: summaryData.description,
          imageUrl: summaryData.thumbnail?.source,
          url: summaryData.content_urls?.desktop?.page
        };
      }
      return null;
    } catch (e) {
      this.logger.error(`Wikipedia summary failed: ${e.message}`);
      return null;
    }
  }

  async searchUniversal(query: string) {
    if (!query) return { success: true, data: [] };
    this.logger.log(`Performing universal search for: "${query}"`);

    try {
      const [animeRes, mangaRes, gamesRes, wikiRes, cinemaRes] = await Promise.all([
        fetch(`${this.JIKAN_API}/anime?q=${encodeURIComponent(query)}&limit=4`).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${this.JIKAN_API}/manga?q=${encodeURIComponent(query)}&limit=4`).then(r => r.json()).catch(() => ({ data: [] })),
        this.RAWG_KEY 
          ? fetch(`${this.RAWG_API}/games?key=${this.RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=4`).then(r => r.json()).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        this.getWikipediaSummary(query),
        this.YT_KEY
          ? fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' trailer oficial')}&maxResults=3&type=video&key=${this.YT_KEY}`).then(r => r.json()).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] })
      ]);

      const results = [
        ...(animeRes.data || []).map((i: any) => ({ id: i.mal_id.toString(), type: 'anime', title: i.title, imageUrl: i.images?.jpg?.image_url, source: 'Jikan' })),
        ...(mangaRes.data || []).map((i: any) => ({ id: i.mal_id.toString(), type: 'manga', title: i.title, imageUrl: i.images?.jpg?.image_url, source: 'Jikan' })),
        ...(gamesRes.results || []).map((i: any) => ({ id: i.id.toString(), type: 'game', title: i.name, imageUrl: i.background_image, source: 'RAWG' })),
        ...(cinemaRes.items || []).map((v: any) => ({ id: v.id.videoId, type: 'video', title: v.snippet.title, imageUrl: v.snippet.thumbnails?.high?.url, source: 'YouTube' }))
      ];

      // Add a special entry if wikiRes suggests it's a personality or movie not found elsewhere
      if (wikiRes && results.length < 8) {
         results.push({
            id: wikiRes.canonicalTitle,
            type: 'wiki',
            title: wikiRes.title,
            imageUrl: wikiRes.imageUrl,
            source: 'Wikipedia'
         });
      }

      return { 
        success: true, 
        data: results,
        wiki: wikiRes
      };
    } catch (e) {
      this.logger.error(`Universal search failed: ${e.message}`);
      return { success: false, error: 'Search failed' };
    }
  }

  async getDetail(type: string, id: string) {
    try {
      if (type === 'anime') {
        const res = await fetch(`${this.JIKAN_API}/anime/${id}/full`);
        const data = await res.json();
        const item = data.data;
        if (!item) return { success: false, error: 'No data' };
        return {
          success: true,
          data: {
            title: item.title,
            description: item.synopsis,
            imageUrl: item.images?.jpg?.large_image_url,
            rating: item.score,
            genres: item.genres?.map((g: any) => g.name),
            studios: item.studios?.map((s: any) => s.name),
            episodes: item.episodes,
            status: item.status,
            trailer: item.trailer?.embed_url,
            year: item.year
          }
        };
      } else if (type === 'manga') {
        const res = await fetch(`${this.JIKAN_API}/manga/${id}/full`);
        const data = await res.json();
        const item = data.data;
        if (!item) return { success: false, error: 'No data' };
        return {
          success: true,
          data: {
            title: item.title,
            description: item.synopsis,
            imageUrl: item.images?.jpg?.large_image_url,
            rating: item.score,
            genres: item.genres?.map((g: any) => g.name),
            authors: item.authors?.map((a: any) => a.name),
            chapters: item.chapters,
            volumes: item.volumes,
            status: item.status,
            published: item.published?.prop?.from?.year
          }
        };
      } else if (type === 'game') {
        const url = this.RAWG_KEY ? `${this.RAWG_API}/games/${id}?key=${this.RAWG_KEY}` : null;
        let item: any = null;
        
        if (url) {
          try {
            const res = await fetch(url);
            if (res.ok) item = await res.json();
          } catch (e) {
            this.logger.warn(`RAWG detail fetch failed for ${id}, falling back to YouTube.`);
          }
        }

        if (item && !item.detail) { // RAWG returned data
          return {
            success: true,
            data: {
              title: item.name,
              description: item.description_raw || item.description,
              imageUrl: item.background_image,
              rating: item.rating,
              genres: item.genres?.map((g: any) => g.name),
              released: item.released,
              website: item.website,
              platforms: item.platforms?.map((p: any) => p.platform.name)
            }
          };
        } else {
          // Fallback: Search YouTube for the game name (if we have it) or just show a generic YouTube response
          // Note: In fallback mode, the "id" passed might be the YouTube videoId from getTrending
          return this.getDetail('cinema', id); 
        }
      } else if (type === 'cinema' || type === 'video') {
        if (!this.YT_KEY) return { success: false, error: 'API Key missing' };
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${this.YT_KEY}`);
        const data = await res.json();
        const item = data.items?.[0];
        if (!item) return { success: false, error: 'Video not found' };
        return {
          success: true,
          data: {
            title: item.snippet.title,
            description: item.snippet.description,
            imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
            trailer: `https://www.youtube.com/embed/${id}`, // Video itself is the "trailer"
            channel: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            views: item.statistics?.viewCount
          }
        };
      }
      return { success: false, error: 'Unknown type' };
    } catch (e) { 
      this.logger.error(`Error in getDetail: ${e.message}`);
      return { success: false, error: 'Failed' }; 
    }
  }
}
