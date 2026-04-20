import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);
  private readonly JIKAN_API = 'https://api.jikan.moe/v4';
  private readonly RAWG_API = 'https://api.rawg.io/api';
  private readonly TMDB_API = 'https://api.themoviedb.org/3';
  private readonly RAWG_KEY = process.env.RAWG_API_KEY || '';
  private readonly YT_KEY = process.env.YOUTUBE_API_KEY || '';
  private readonly TMDB_KEY = process.env.TMDB_API_KEY || '';
  private readonly GOOGLE_SEARCH_KEY = process.env.GOOGLE_SEARCH_KEY || '';
  private readonly GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || '';

  // Cache de Emergência Estético (Imagens de Alta Qualidade de Reserva - Alpha Signature)
  private readonly FALLBACK_GALLERY = [
    { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Digital Odyssey Surreal Alt Aesthetic', color: '#7000ff' },
    { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Modern Portrait Alt Style Aesthetic', color: '#ffb300' },
    { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200', source: 'Alpha Reserve', prompt: 'High Fashion Streetwear Concept', color: '#000000' },
    { url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Vibrant Liquid Mesh Aesthetic Art', color: '#00f2ff' },
    { url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Neon Retrowave Alpha Vision', color: '#ff0055' },
    { url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Cyberpunk Aesthetic Masterpiece', color: '#ff00ff' }
  ];

  // No longer needed after Civitai migration

  constructor() {
    this.logger.log(`Alpha Resilience Shield Active. YT: ${!!this.YT_KEY}, TMDB: ${!!this.TMDB_KEY}`);
  }

  private getCoreQuery(query: string): string {
    if (!query) return '';
    const isShort = query.split(' ').length <= 3;
    // Poda de prompt para motores de busca (extrai a essência sujeito + atributos chave)
    const noise = ['background', 'style', 'inspired by', 'cinematic', 'lighting', 'highly detailed', 'masterpiece', '4k', '8k', 'render', 'illustration'];
    let clean = query.toLowerCase();
    
    // Se for curto, não remove ruído para não perder precisão (ex: "4k wallpaper")
    if (!isShort) {
      noise.forEach(n => { clean = clean.split(n).join(''); });
    }
    
    const words = clean.split(/[\s,]+/).filter(w => w.length > 2);
    // Retorna até 10 palavras significativas para maior precisão em buscas
    return words.slice(0, 10).join(' ');
  }

  private async fetchCivitai(query: string, page = 1) {
    try {
      const core = this.getCoreQuery(query);
      // Civitai API: Sort by Most Reactions p/ garantir Elite Art
      const url = `https://civitai.com/api/v1/images?query=${encodeURIComponent(core)}&limit=20&sort=Most%20Reactions&period=AllTime`;
      const res = await this.fetchWithTimeout(url);
      return await res.json();
    } catch (e) {
      this.logger.error(`Civitai Fetch Error: ${e.message}`);
      return { items: [] };
    }
  }

  private async fetchSafebooru(tags: string, limit = 20) {
    try {
      // Safebooru: Mestre em Personagens e Séries
      const cleanTags = tags.toLowerCase().replace(/ /g, '_').replace(/ /g, '+');
      const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(cleanTags)}+rating:safe&limit=${limit}&json=1`;
      const res = await this.fetchWithTimeout(url);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  private async fetchGlobalNetwork(query: string, limit = 20) {
    // Redireciona para o Google Oficial se a chave estiver presente, senão usa o Fallback de Elite
    if (this.GOOGLE_SEARCH_KEY && this.GOOGLE_SEARCH_CX) {
      return this.fetchGoogleImages(query, 1);
    }
    try {
      // Fallback: Ponte Alpha via Lexica para manter a aplicação viva sem chaves
      const url = `https://lexica.art/api/v1/search?q=${encodeURIComponent(query + ' high quality artistic')}`;
      const res = await this.fetchWithTimeout(url);
      const data = await res.json();
      return (data.images || []).map((img: any) => ({
        url: img.srcSmall || img.src,
        width: img.width, height: img.height,
        source: 'Galeria Alpha (Global Bridge)', prompt: img.prompt || query
      }));
    } catch (e) {
       return [];
    }
  }

  private async fetchGoogleImages(query: string, page = 1) {
    if (!this.GOOGLE_SEARCH_KEY || !this.GOOGLE_SEARCH_CX) return [];
    try {
      const start = (page - 1) * 10 + 1;
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.GOOGLE_SEARCH_KEY}&cx=${this.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&searchType=image&num=10&start=${start}&safe=active`;
      const res = await this.fetchWithTimeout(url);
      const data = await res.json();
      
      return (data.items || []).map((item: any) => ({
        url: item.link,
        width: item.image?.width,
        height: item.image?.height,
        source: 'Google Images (Oficial)',
        prompt: item.title,
        link: item.image?.contextLink
      }));
    } catch (e) {
      this.logger.error(`Google Search Error: ${e.message}`);
      return [];
    }
  }

  // Helper de Resiliência: Timeout + Retries + Error Handling
  private async fetchWithTimeout(url: string, options: any = {}, timeout = 8000, retires = 1) {
    for (let i = 0; i <= retires; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        // Se não estiver OK, lança erro para trigger do modo de segurança no catch
        if (!response.ok && response.status !== 404) throw new Error(`HTTP Error ${response.status}`);
        return response;
      } catch (error) {
        clearTimeout(id);
        if (i === retires) throw error;
        this.logger.warn(`Alpha Auto-Retry [${i + 1}/${retires}]: ${url.split('?')[0]}`);
        // Pequena pausa antes do retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error('Fatal: Alpha Resilience Hub could not reach external endpoint.');
  }

  private readonly ANILIST_API = 'https://graphql.anilist.co';

  async searchAniList(query: string) {
    try {
      const q = `
        query ($search: String) {
          Page(perPage: 6) {
            media(search: $search, type: ANIME, isAdult: false) {
              id
              title { romaji english }
              coverImage { large }
              description
              bannerImage
              averageScore
              status
              episodes
              genres
            }
          }
        }
      `;
      const res = await this.fetchWithTimeout(this.ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { search: query } })
      });
      const data = await res.json();
      return data.data?.Page?.media || [];
    } catch (e) { return []; }
  }

  async searchAnilistCharacter(query: string) {
    try {
      const q = `
        query ($search: String) {
          Character (search: $search) {
            name { full native }
            image { large }
            description
            media (perPage: 1) { nodes { title { romaji } } }
          }
        }
      `;
      const res = await this.fetchWithTimeout(this.ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { search: query } })
      });
      const data = await res.json();
      return data.data?.Character || null;
    } catch (e) { return null; }
  }

  async getRedditTrends(subreddit: string = 'anime') {
    try {
      const res = await this.fetchWithTimeout(`https://www.reddit.com/r/${subreddit}/hot.json?limit=6`, {
        headers: { 'User-Agent': 'AlphaNetwork/1.0' }
      });
      const data = await res.json();
      return (data.data?.children || []).map((c: any) => ({
        id: c.data.id,
        title: c.data.title,
        author: c.data.author,
        url: `https://reddit.com${c.data.permalink}`,
        thumbnail: c.data.thumbnail?.startsWith('http') ? c.data.thumbnail : null,
        ups: c.data.ups,
        num_comments: c.data.num_comments
      }));
    } catch (e) { return []; }
  }

  // Cache em memoria para evitar chamadas repetidas ao Google (TTL 5 min)
  private readonly galCache = new Map<string, { data: any[]; ts: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  async getAestheticGallery(query: string, page = 1) {
    try {
      const cleanQ = query?.trim();

      // ── MEMORY CACHE INTERCEPTOR (0ms Latency) ──
      const cacheKey = `${cleanQ || 'trending'}_p${page}`;
      const cached = this.galCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
         this.logger.log(`Twin Core [P${page}]: Cache Hit for "${cacheKey}" ⚡ (0ms)`);
         return cached.data;
      }

      // Tags base para o feed de tendências (sem pesquisa)
      // Formato Booru usa _ em vez de espaços
      const trendingPool = [
        'highres',
        'cyberpunk scenery',
        'scenery',
        'blue_lock',
        'jujutsu_kaisen',
        'chainsaw_man',
        'makima_(chainsaw_man)',
        'itoshi_rin'
      ];
      
      let booruQuery = '';
      if (cleanQ) {
         booruQuery = cleanQ.toLowerCase(); // Boorus ONLY accept lowercase tags
         // Se a pesquisa não tiver underscores, assumimos que foi o utilizador a digitar (ex: 'maki zenin')
         // Transformamos os espaços do utilizador em underscores para a API ativar a sua engine de "Alias" (ex: maki_zenin -> zenin_maki)
         if (!booruQuery.includes('_')) {
            booruQuery = booruQuery.replace(/\s+/g, '_');
         }
      } else {
         booruQuery = trendingPool[(page + Math.floor(Date.now() / 300000)) % trendingPool.length];
      }

      this.logger.log(`Twin Core [P${page}]: "${booruQuery}" (Booru) | "${cleanQ || booruQuery.replace(/_/g, ' ')}" (DeviantArt)`);

      // ── THE TWIN CORE: Parallel Fetch ──
      const danbooruPromise = (async () => {
         try {
            // "Censorship Protocol": Forcefully inject safe rating and restrict to SFW logic
            const booruSafeQuery = `${booruQuery} rating:safe`;
            const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(booruSafeQuery)}&limit=30&page=${page}`;
            
            const res = await this.fetchWithTimeout(url, { headers: { 'User-Agent': 'AlphaNetwork/1.0' } });
            if (!res.ok) return [];
            const posts = await res.json();
            if (!Array.isArray(posts)) return [];
            
            return posts
              .filter((img: any) => img.large_file_url || img.file_url)
              .filter((img: any) => img.rating === 's' || img.rating === 'g') // Double Validation
              .filter((img: any) => {
                 const url = img.large_file_url || img.file_url;
                 return !url.endsWith('.mp4') && !url.endsWith('.webm') && !url.endsWith('.zip');
              })
              .map((img: any) => ({
                url: img.large_file_url || img.file_url,
                width: img.image_width,
                height: img.image_height,
                source: 'Danbooru',
                prompt: img.tag_string,
                color: '#bc13fe'
              }));
         } catch { return []; }
      })();

      const devQuery = cleanQ || trendingPool[(page + Math.floor(Date.now() / 300000)) % trendingPool.length].replace(/_/g, ' ');
      const deviantartPromise = this.fetchDeviantArt(devQuery, page);

      const [danbooruPosts, deviantartPosts] = await Promise.all([danbooruPromise, deviantartPromise]);

      const combined = [...danbooruPosts, ...deviantartPosts].sort(() => Math.random() - 0.5);

      if (combined.length === 0) throw new Error('Empty Twin Core Mix');

      // Save to memory cache to ensure instantaneous subsequent loads
      this.galCache.set(cacheKey, { data: combined, ts: Date.now() });

      return combined;
    } catch (e) {
      this.logger.error(`Twin Core Nexus Error: ${e.message}`);
      // Se for a primeira página, devolvemos o fallback para a galeria não ficar vazia
      // Se for página > 1, devolvemos array vazio para parar o loop infinito do frontend
      if (page > 1) return [];
      return [...this.FALLBACK_GALLERY].sort(() => Math.random() - 0.5);
    }
  }

  // ── DeviantArt Native RSS Extractor ──
  private async fetchDeviantArt(query: string, page: number): Promise<any[]> {
    try {
      const q = encodeURIComponent(query);
      const offset = (page - 1) * 30;
      const url = `https://backend.deviantart.com/rss.xml?q=${q}&offset=${offset}`;
      
      const res = await this.fetchWithTimeout(url, { headers: { 'User-Agent': 'AlphaNetwork/1.0' } });
      if (!res.ok) return [];
      const xml = await res.text();
      
      const items: any[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      
      while ((match = itemRegex.exec(xml)) !== null) {
        const itemBody = match[1];
        
        const mediaMatch = itemBody.match(/<media:content[^>]+url="([^"]+)"/);
        const thumbMatch = itemBody.match(/<media:thumbnail[^>]+url="([^"]+)"/);
        
        const titleMatch = itemBody.match(/<title>([\s\S]*?)<\/title>/);
        const creditMatch = itemBody.match(/<media:credit[^>]*>([\s\S]*?)<\/media:credit>/);
        
        let urlMatch = mediaMatch?.[1] || thumbMatch?.[1];
        if (!urlMatch) continue;
        
        urlMatch = urlMatch.replace(/&amp;/g, '&');
        // Prevent literature formats or layout templates
        if (!urlMatch.match(/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i)) continue;
        
        // Alpha Purifier: Forcefully eject any image encrypted with DeviantArt's CDN blur or marked mature
        if (urlMatch.includes('/blur_') || itemBody.includes('<media:rating>adult</media:rating>')) continue;
        
        let promptStr = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Digital Art';
        if (creditMatch) promptStr = `${promptStr} by ${creditMatch[1].trim()}`;

        items.push({
          url: urlMatch,
          width: 0,
          height: 0,
          source: 'DeviantArt',
          prompt: promptStr,
          color: '#05cc47' // DeviantArt signature green
        });
        
        if (items.length >= 30) break; // Limit to 30 items per payload
      }
      return items;
    } catch {
      return [];
    }
  }
  // Alpha Neural Auto-Suggest (Booru Gateway)
  async getTagSuggestions(query: string) {
    if (!query || query.trim().length < 2) return [];
    try {
      const q = query.trim().toLowerCase().replace(/\s+/g, '_');
      const url = `https://danbooru.donmai.us/tags.json?search[name_matches]=*${encodeURIComponent(q)}*&search[order]=count&limit=8`;
      const res = await this.fetchWithTimeout(url, { headers: { 'User-Agent': 'AlphaNetwork/1.0' } });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const tags = await res.json();
      return tags.map((t: any) => ({
         name: t.name,
         count: t.post_count,
         category: t.category === 4 ? 'character' : t.category === 3 ? 'series' : t.category === 1 ? 'artist' : 'general'
      }));
    } catch (e) {
      this.logger.error(`Tag Suggestion Error: ${e.message}`);
      return [];
    }
  }

  async getTrendingAnime() {
    try {
      this.logger.log('Fetching trending anime...');
      const res = await this.fetchWithTimeout(`${this.JIKAN_API}/top/anime?filter=airing&limit=12`);
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
      const res = await this.fetchWithTimeout(`${this.RAWG_API}/games?key=${this.RAWG_KEY}&ordering=-added&page_size=12`);
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
      const res = await this.fetchWithTimeout(`${this.JIKAN_API}/top/manga?filter=publishing&limit=12`);
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
    return this.fetchYoutube('novos trailers cinema oficial 2024 2025', 'cinema');
  }

  private async fetchYoutube(q: string, type: string) {
    if (!this.YT_KEY) return { success: false, error: 'API Key missing' };
    try {
      const fetchWithQuery = async (query: string) => {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=12&key=${this.YT_KEY}`;
        const res = await this.fetchWithTimeout(url);
        return res.json();
      };

      let data = await fetchWithQuery(q);

      // DIAGNÓSTICO DE QUOTA: Se a quota exceder ou não houver resultados, usamos o Motor de Emergência
      const isQuotaError = data.error && (data.error.message?.includes('quota') || data.error?.code === 403);

      if (isQuotaError && type === 'cinema') {
        this.logger.warn(`YouTube Quota Exceeded! Emergency Engine: Wikipedia Cinema Fallback.`);
        const wikiResults = await this.searchWebGeneral('estreias filmes cinema 2024 2025');
        return {
          success: true,
          data: wikiResults.map((item: any) => ({
            id: item.title,
            type: 'cinema',
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            isWiki: true
          }))
        };
      }

      // Fallback if no items found
      if ((!data.items || data.items.length === 0) && type === 'cinema') {
        this.logger.warn(`No results for primary cinema query, trying fallback...`);
        data = await fetchWithQuery('melhores filmes 2024 2025 trailers');
      }

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
    } catch (e) {
      this.logger.error(`YouTube fetch failed: ${e.message}`);
      return { success: false, error: 'Failed' };
    }
  }

  /**
   * Get Full Wikipedia Article
   */
  async getWikipediaArticle(title: string) {
    try {
      const normalizedTitle = title.trim().replace(/ /g, '_');
      this.logger.log(`Fetching Wiki Article (Action API Migration): ${normalizedTitle}`);

      const [parseRes, queryRes] = await Promise.all([
        this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(normalizedTitle)}&prop=text|sections&format=json&noimages=0&mobileformat=1`, {
          headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
        }),
        this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(normalizedTitle)}&prop=pageimages|description&format=json&pithumbsize=1000`, {
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

      const searchRes = await this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=1&namespace=0&format=json`, {
        headers: { 'User-Agent': 'AlphaNetworkApp/1.0' }
      });
      const searchData = await searchRes.json();

      const title = searchData[1]?.[0];
      if (!title) return null;

      const summaryRes = await this.fetchWithTimeout(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
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

  async searchWebGeneral(query: string) {
    try {
      // 1. Wikipedia Search (List of titles)
      const wikiSearchRes = await this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=8&format=json&origin=*`).then(r => r.json()).catch(() => null);

      if (!wikiSearchRes?.query?.search) return [];

      const titles = wikiSearchRes.query.search.map((s: any) => s.title);

      // 2. Batch fetch details for these titles (Images + Extracts)
      const detailsRes = await this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join('|'))}&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=1000&exintro&explaintext&exsentences=1&format=json&origin=*`).then(r => r.json()).catch(() => null);

      const results: any[] = [];
      const pages = detailsRes?.query?.pages ? Object.values(detailsRes.query.pages) : [];

      for (const page of pages as any[]) {
        let imageUrl = page.thumbnail?.source;

        // Extra Fallback: If no thumb, try to find ANY image on the page
        if (!imageUrl) {
          const imgListRes = await this.fetchWithTimeout(`https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(page.title)}&prop=images&format=json&origin=*`).then(r => r.json()).catch(() => null);
          const firstImgTitle = imgListRes?.query?.pages?.[Object.keys(imgListRes.query.pages)[0]]?.images?.[0]?.title;
          if (firstImgTitle) {
            const imgInfoRes = await fetch(`https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(firstImgTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`).then(r => r.json()).catch(() => null);
            imageUrl = imgInfoRes?.query?.pages?.[Object.keys(imgInfoRes.query.pages)[0]]?.imageinfo?.[0]?.thumburl;
          }
        }

        // Final Fallback: YouTube Vision
        if (!imageUrl && this.YT_KEY) {
          const ytSearch = await this.fetchWithTimeout(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(page.title + ' oficial')}&maxResults=1&type=video&key=${this.YT_KEY}`).then(r => r.json()).catch(() => null);
          imageUrl = ytSearch?.items?.[0]?.snippet?.thumbnails?.high?.url;
        }

        results.push({
          id: page.title,
          type: 'web',
          title: page.title,
          description: page.extract || 'Explora este artigo na rede Alpha...',
          source: 'Wikipedia Global',
          imageUrl: imageUrl || null
        });
      }

      return results;
    } catch (e) {
      return [];
    }
  }

  async searchUniversal(query: string) {
    if (!query) return { success: true, data: [] };
    this.logger.log(`Performing universal search for: "${query}"`);

    try {
      const promises: Promise<any>[] = [
        this.fetchWithTimeout(`${this.JIKAN_API}/anime?q=${encodeURIComponent(query)}&limit=4`).then(r => r.json()).catch(() => ({ data: [] })),
        this.fetchWithTimeout(`${this.JIKAN_API}/manga?q=${encodeURIComponent(query)}&limit=4`).then(r => r.json()).catch(() => ({ data: [] })),
        this.RAWG_KEY
          ? this.fetchWithTimeout(`${this.RAWG_API}/games?key=${this.RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=4`).then(r => r.json()).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        this.getWikipediaSummary(query),
        this.YT_KEY
          ? this.fetchWithTimeout(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' noticia')}&maxResults=5&type=video&key=${this.YT_KEY}`).then(r => r.json()).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
        this.searchWebGeneral(query)
      ];

      if (this.TMDB_KEY) {
        promises.push(
          this.fetchWithTimeout(`${this.TMDB_API}/search/multi?api_key=${this.TMDB_KEY}&query=${encodeURIComponent(query)}&language=pt-BR&include_adult=false`)
            .then(r => r.json()).catch(() => ({ results: [] }))
        );
      }

      const [animeRes, mangaRes, gamesRes, wikiRes, cinemaRes, webRes, tmdbRes] = await Promise.all(promises);

      const results: any[] = [];

      // 1. TMDB (High priority for movies/tv)
      if (tmdbRes?.results) {
        tmdbRes.results.filter((i: any) => i.media_type !== 'person').forEach((i: any) => {
          results.push({
            id: i.id.toString(),
            type: i.media_type,
            title: i.title || i.name,
            imageUrl: i.poster_path ? `https://image.tmdb.org/t/p/w500${i.poster_path}` : null,
            source: 'TMDB',
            description: i.overview
          });
        });
      }

      // 2. Web Results (Global knowledge)
      if (webRes) {
        webRes.forEach((w: any) => results.push(w));
      }

      // 3. YouTube News/Cinema
      if (cinemaRes?.items) {
        cinemaRes.items.forEach((v: any) => {
          results.push({
            id: v.id.videoId,
            type: 'video',
            title: v.snippet.title,
            imageUrl: v.snippet.thumbnails?.high?.url,
            source: 'YouTube News',
            description: v.snippet.description
          });
        });
      }

      // 4. Niches (Anime, Manga, Games)
      if (animeRes?.data) animeRes.data.forEach((i: any) => results.push({ id: i.mal_id.toString(), type: 'anime', title: i.title, imageUrl: i.images?.jpg?.image_url, source: 'Jikan' }));
      if (mangaRes?.data) mangaRes.data.forEach((i: any) => results.push({ id: i.mal_id.toString(), type: 'manga', title: i.title, imageUrl: i.images?.jpg?.image_url, source: 'Jikan' }));
      if (gamesRes?.results) gamesRes.results.forEach((i: any) => results.push({ id: i.id.toString(), type: 'game', title: i.name, imageUrl: i.background_image, source: 'RAWG' }));

      return {
        success: true,
        data: results.slice(0, 24),
        wiki: wikiRes
      };
    } catch (e) {
      this.logger.error(`Universal search failed: ${e.message}`);
      return { success: false, error: 'Search failed' };
    }
  }

  async getDetail(type: string, id: string, q?: string, page = 1) {
    try {
      if (type === 'image') {
        // Motor de Relações para Danbooru: API não autenticada só aceita 2 tags.
        // O `q` contém dezenas de tags (img.prompt). Extraímos as 2 primeiras tags.
        let searchTags = q || 'aesthetic';
        if (searchTags.includes(' ')) {
           searchTags = searchTags.split(/\s+/).slice(0, 2).join(' ');
        }
        
        const related = await this.getAestheticGallery(searchTags, page);
        return {
          success: true,
          data: {
            title: 'Alpha Aesthetic Discovery',
            description: q || 'Premium Visual Choice',
            imageUrl: id,
            source: 'Alpha Vision',
            related: Array.isArray(related) ? related : []
          }
        };
      }
      if (type === 'anime') {
        const res = await this.fetchWithTimeout(`${this.JIKAN_API}/anime/${id}/full`);
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
        const res = await this.fetchWithTimeout(`${this.JIKAN_API}/manga/${id}/full`);
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
            const res = await this.fetchWithTimeout(url);
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
      } else if (type === 'movie' || type === 'tv') {
        if (!this.TMDB_KEY) {
          // INTELLIGENCE FALLBACK: Wiki + YouTube
          this.logger.warn('TMDB_KEY missing. Using Wiki+YT fallback.');
          const wikiSummary = await this.getWikipediaSummary(id); // Use ID as title if it's a slug

          if (!wikiSummary) {
            return this.getDetail('cinema', id);
          }

          return {
            success: true,
            data: {
              title: wikiSummary.title,
              description: wikiSummary.extract,
              imageUrl: wikiSummary.imageUrl,
              tagline: wikiSummary.description,
              source: 'Wikipedia',
              trailer: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(wikiSummary.title + ' trailer oficial')}`
            }
          };
        }
        const res = await this.fetchWithTimeout(`${this.TMDB_API}/${type}/${id}?api_key=${this.TMDB_KEY}&language=pt-BR&append_to_response=videos,credits`);
        const item = await res.json();
        if (!item.id) return { success: false, error: 'Content not found on TMDB' };

        return {
          success: true,
          data: {
            title: item.title || item.name,
            description: item.overview,
            imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null,
            rating: item.vote_average,
            genres: item.genres?.map((g: any) => g.name),
            released: item.release_date || item.first_air_date,
            status: item.status,
            tagline: item.tagline,
            runtime: item.runtime || (item.episode_run_time ? item.episode_run_time[0] : null),
            episodes: item.number_of_episodes,
            seasons: item.number_of_seasons,
            cast: item.credits?.cast?.slice(0, 5).map((c: any) => c.name),
            trailer: item.videos?.results?.find((v: any) => v.type === 'Trailer')?.key
              ? `https://www.youtube.com/embed/${item.videos.results.find((v: any) => v.type === 'Trailer').key}`
              : null
          }
        };
      } else if (type === 'web') {
        // Fetch detailed summary for web/wiki hybrid results
        const wikiSummary = await this.getWikipediaSummary(id);
        if (wikiSummary) {
          return {
            success: true,
            data: {
              title: wikiSummary.title,
              description: wikiSummary.extract,
              imageUrl: wikiSummary.imageUrl,
              tagline: wikiSummary.description,
              source: 'Wikipedia Global',
              trailer: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(wikiSummary.title + ' trailer')}`
            }
          };
        }
        return { success: false, error: 'Detalles no encontrados' };
      } else if (type === 'cinema' || type === 'video' || type === 'wiki') {
        if (!this.YT_KEY) return { success: false, error: 'API Key missing' };
        const res = await this.fetchWithTimeout(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${this.YT_KEY}`);
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
