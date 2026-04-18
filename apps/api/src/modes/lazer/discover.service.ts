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

  // Cache de Emergência Estético (Imagens de Alta Qualidade de Reserva - Alpha Signature)
  private readonly FALLBACK_GALLERY = [
    { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Digital Odyssey Surreal Alt Aesthetic', color: '#7000ff' },
    { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Modern Portrait Alt Style Aesthetic', color: '#ffb300' },
    { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200', source: 'Alpha Reserve', prompt: 'High Fashion Streetwear Concept', color: '#000000' },
    { url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Vibrant Liquid Mesh Aesthetic Art', color: '#00f2ff' },
    { url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Neon Retrowave Alpha Vision', color: '#ff0055' },
    { url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1200', source: 'Alpha Reserve', prompt: 'Cyberpunk Aesthetic Masterpiece', color: '#ff00ff' }
  ];

  private seaartToken: string = '';
  private seaartTokenExpiry: number = 0;

  constructor() {
    this.logger.log(`Alpha Resilience Shield Active. YT: ${!!this.YT_KEY}, TMDB: ${!!this.TMDB_KEY}`);
  }

  private async getSeaArtToken() {
    if (this.seaartToken && Date.now() < this.seaartTokenExpiry) return this.seaartToken;
    try {
      const res = await this.fetchWithTimeout('https://www.seaart.ai/api/v1/user/tourist_login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Id': '100' },
        body: JSON.stringify({ device_id: `alpha_${Math.random().toString(36).substring(7)}` })
      });
      const data = await res.json();
      if (data.code === 0) {
        this.seaartToken = data.data.token;
        this.seaartTokenExpiry = Date.now() + 3600000; // 1h cache
        return this.seaartToken;
      }
    } catch (e) {
      this.logger.error(`SeaArt Login Failed: ${e.message}`);
    }
    return null;
  }

  private async fetchSeaArt(query: string, page = 1) {
    const token = await this.getSeaArtToken();
    if (!token) return { data: { items: [] } };
    try {
      const res = await this.fetchWithTimeout('https://www.seaart.ai/api/v1/common/get_work_list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': '100',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ keywords: query, page, page_size: 15, order_by: 'hot' })
      });
      return await res.json();
    } catch (e) { return { data: { items: [] } }; }
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

  async getAestheticGallery(query: string, page = 1) {
    try {
      const cleanQ = query?.trim();
      const queriesToFetch: any[] = [];

      if (!cleanQ) {
        // Pilares de Curadoria Alpha: Equilíbrio ARTICIAL (Lexica) vs NATURAL (Unsplash)
        const pillars = [
          // Imagem 1 - Goth anime girl autumn park
          {
            art: "dark skin anime girl, short black blue hair, blue glowing eyes, lace dress, choker, cross necklace, sitting on bench with pet rats, autumn fire background",
            nat: "gothic aesthetic girl sitting outdoors, dark skin, edgy jewelry, lace outfit, warm autumn bokeh background",
            style: "modern anime illustration, detailed shading, cinematic lighting",
            mood: "mysterious, melancholic, cool confidence",
            palette: "deep orange, midnight blue, warm amber, black"
          },

          // Imagem 2 - Tattoo face anime girl dark
          {
            art: "anime girl close-up, blank white eyes, face tattoos, kanji shoulder tattoo, black outfit, finger over lips, dark moody background",
            nat: "alternative girl with face tattoos, dramatic dark portrait, finger on lips pose, dark underground aesthetic",
            style: "semi-realistic anime, heavy ink lines, low saturation",
            mood: "enigmatic, edgy, secretive",
            palette: "muted beige, charcoal, warm shadow tones"
          },

          // Imagem 3 - Punk anime girl selfie
          {
            art: "anime girl, white platinum hair with red highlights, pink eyes, punk graphic tee, pleated black mini skirt, chain belt, spike choker, smiling selfie pose, tattoos on arm",
            nat: "punk girl selfie, dyed hair, edgy accessories, graphic band tee, chain belt, alternative fashion",
            style: "high detail modern anime, bright clean render",
            mood: "rebellious, energetic, playful",
            palette: "hot pink, crisp white, jet black, silver chain"
          },

          // Imagem 4 - Lo-fi music anime boy
          {
            art: "anime boy sitting cross-legged, pink green braided hair, oversized hoodie, ripped jeans, headphones, holding phone, eyes closed, solid color background",
            nat: "lo-fi aesthetic boy listening to music, colorful braids, streetwear hoodie, relaxed floor sitting pose",
            style: "flat anime illustration, retro poster aesthetic, bold outlines",
            mood: "peaceful, introspective, lo-fi chill",
            palette: "mustard yellow background, soft pink, sage green, denim blue"
          },

          // Imagem 5 - Manga editorial collage girl
          {
            art: "manga style girl, black short hair, black turtleneck crop top, dark pants, hand in hair pose, surrounded by manga panel collage background, grayscale",
            nat: "dark aesthetic girl editorial photo, black outfit, short hair, hand in hair, moody black and white",
            style: "manga ink illustration, panel collage layout, high contrast B&W",
            mood: "cold, intense, brooding",
            palette: "pure black, white, mid-gray"
          },

          // Imagem 6 - Clean anime girl bun dress
          {
            art: "anime girl top-down angle, black hair bun, blue eyes, off-shoulder gray bodycon dress, sitting pose, clean white background",
            nat: "elegant asian girl, hair bun, gray fitted dress, top-down portrait angle, minimal white background",
            style: "clean semi-realistic anime, soft shading, studio lighting",
            mood: "soft, elegant, approachable",
            palette: "silver gray, jet black, porcelain skin, white"
          },

          // Imagem 7 - Dark academia boy portrait
          {
            art: "anime boy side profile, curly dark brown hair, black blazer, white shirt collar, moody outdoor background, desaturated tones",
            nat: "dark academia aesthetic boy, side profile, curly hair, blazer, desaturated moody photography",
            style: "cinematic film grain, desaturated realism",
            mood: "melancholic, intellectual, brooding",
            palette: "dark brown, charcoal, faded warm gray, shadow tones"
          },

          // Imagem 8 - Mystery book boy aesthetic
          {
            art: "anime boy reclined, dark messy hair, vest over white shirt, book covering face, dim room, framed painting on wall",
            nat: "mystery aesthetic boy covering face with book, vest outfit, moody indoor lighting, vintage room",
            style: "candid low-light photography aesthetic, desaturated realism",
            mood: "mysterious, introverted, cinematic",
            palette: "warm sepia, muted gray, soft amber"
          },

          // Imagem 9 - Cozy girl glasses cafe
          {
            art: "real-style anime girl, messy hair bun with bangs, round gold glasses, off-shoulder beige knit sweater, eyes closed soft smile, cozy cluttered kitchen background",
            nat: "asian girl cozy morning vibe, round glasses, messy bun, knit sweater, warm kitchen bokeh, film photo aesthetic",
            style: "film photography, warm grain, soft focus bokeh",
            mood: "cozy, warm, intimate, soft",
            palette: "warm cream, dusty rose, golden hour light, soft shadow"
          },

          // Imagem 10 - E-girl anime selfie wink
          {
            art: "anime girl selfie, green hair updo, winged eyeliner, sheer black mesh top, black bralette, pearl necklace, gold hoop earrings, peace sign, tongue out, gray wall",
            nat: "e-girl aesthetic selfie, green hair, mesh top, hoop earrings, pearl necklace, peace sign pose, bold makeup",
            style: "high contrast modern anime, clean cel shading, selfie angle",
            mood: "bold, provocative, playful",
            palette: "emerald green, deep black, pearl white, gold accent"
          },

          // Imagem 11 - Soft anime girl floor sunlight
          {
            art: "anime girl lying on wooden floor, curly green hair spread out, mint crop top, white shorts, eyes closed, warm sunlight rays, relaxed pose",
            nat: "soft aesthetic girl lying on floor in sunlight, green hair, pastel outfit, lazy morning vibe",
            style: "soft anime render, warm sunlight shading, dreamy atmosphere",
            mood: "serene, dreamy, lazy day",
            palette: "mint green, warm oak wood, soft white, golden light"
          },

          // Imagem 12 - Cyberpunk anime girl club
          {
            art: "dark skin anime girl, long black hair with red highlights, glowing green eyes, leather collar, harness straps, bar/club neon background, smirk",
            nat: "cyberpunk aesthetic girl in neon bar, dark skin, edgy harness outfit, glowing neon red purple lighting, confident smirk",
            style: "neon noir anime, high contrast glow lighting, cinematic",
            mood: "dangerous, seductive, mysterious",
            palette: "neon red, electric purple, deep black, glowing green"
          },

          // Imagem 13 - E-girl crop top aesthetic
          {
            art: "anime girl torso, silver lavender long hair, white crop tube top, open beige jacket, studded belt, low-rise jeans, star necklace, photo wall background",
            nat: "e-girl aesthetic outfit photo, silver dyed hair, white crop top, studded belt, low rise jeans, vintage photo wall backdrop",
            style: "aesthetic photography, warm film tones, close-up fashion shot",
            mood: "casual cool, trendy, effortless",
            palette: "silver lavender, cream white, denim blue, warm neutral"
          },

          // Imagem 14 - Anime girl hallway knit outfit
          {
            art: "anime girl full body, black bob hair with bangs, blue-gray eyes, rust orange knit crop turtleneck, black denim cut-off shorts, brown boots, indoor hallway setting",
            nat: "asian girl in hallway, black bob hair, cropped knit sweater, black shorts, combat boots, clean indoor natural light",
            style: "detailed modern anime, realistic indoor lighting, full body shot",
            mood: "shy, cute, casual",
            palette: "rust orange, jet black, warm beige tile, brown leather"
          },

          // Imagem 15 - Manga ink girl dynamic pose
          {
            art: "manga ink girl, short black hair, open robe, black bralette, dynamic arms-raised pose, tongue out, lined paper background, bold ink strokes",
            nat: "alternative girl bold pose, open kimono robe, dark bralette, dynamic arms up, black and white editorial",
            style: "manga ink illustration, high contrast hatching, sticker cut-out style",
            mood: "wild, free, unapologetic",
            palette: "black ink, stark white, lined paper gray"
          },

          // Imagem 16 - Anime girl brick wall athletic
          {
            art: "anime girl, platinum silver long hair, gray-green eyes, tied white crop top, black shorts, arms raised behind head, warm brick wall background, golden light",
            nat: "athletic girl against brick wall, silver blonde hair, tied crop top, glowing golden afternoon light, confident pose",
            style: "cinematic anime, warm volumetric lighting, high detail",
            mood: "intense, athletic, sun-drenched confidence",
            palette: "warm gold, brick orange, platinum silver, cream white"
          },

          // Imagem 17 - Anime girl Christmas cozy
          {
            art: "anime girl, dark brown wavy hair, warm red eyes, Santa hat, red strapless holiday dress with fur trim, surrounded by Christmas gifts and tree, warm glow",
            nat: "cozy christmas girl aesthetic, dark hair, holiday red outfit, warm fairy light bokeh, gift-filled room",
            style: "warm anime illustration, holiday glow lighting, rich color render",
            mood: "festive, warm, inviting",
            palette: "crimson red, warm gold, deep brown, fairy light amber"
          },

          // Imagem 18 - Korean girl e-girl aesthetic outfit
          {
            art: "anime-style real girl full body, black bob hair, green long sleeve crop top, black mini shorts, green white striped knee socks, black platform shoes, indoor natural light",
            nat: "korean e-girl full body outfit photo, black bob, green crop top, striped thigh socks, platform sneakers, bright indoor setting",
            style: "clean fashion photography, natural window light, full body frame",
            mood: "cute, confident, playful",
            palette: "emerald green, crisp white, jet black, natural light"
          },

          // Imagem 19 - Soft anime girl pajama cute
          {
            art: "anime girl full body, long blonde hair, red eyes, black graphic crop sweatshirt, pink Hello Kitty pajama pants, hands behind head, neutral background",
            nat: "cute girl in pajama outfit, blonde hair, graphic sweatshirt, character print jogger pants, relaxed home aesthetic",
            style: "clean anime render, flat neutral background, full body character sheet",
            mood: "cute, cozy, soft baddie",
            palette: "blush pink, midnight black, warm blonde, neutral gray"
          },

          // Imagem 20 - Alt goth girl soft grunge outfit
          {
            art: "anime real-style girl, black short bob, pink open-knit mesh crop sweater, black tactical mini skirt with buckles, fishnet tights with tattoo, leather choker with cross charm",
            nat: "soft grunge girl outfit close-up, black bob, pink mesh sweater, tactical skirt, fishnet tights, gothic accessories, dim moody lighting",
            style: "dark fashion photography, low exposure, aesthetic editorial",
            mood: "soft goth, rebellious, sensual",
            palette: "dusty pink, matte black, dark shadow, leather brown"
          },

          {
            art: "minimalist anime elf girl with long silver hair, wearing round sunglasses, clean outfit, calm expression, editorial composition with framed background and secondary faded character scene",

            nat: "high fashion editorial portrait, pale tones, soft lighting, luxury minimal aesthetic, magazine cover style, neutral background with subtle graphic layout",

            style: "minimal anime, editorial design, clean lines, soft shading, low contrast",

            mood: "calm, elegant, introspective, ethereal",

            palette: "white, light gray, soft blue, desaturated tones"
          },

          {
            art: "goth anime girl with short white hair, big expressive eyes, tattoos, wearing punk outfit with spikes, sitting in a neon-lit alley surrounded by black cats, urban graffiti background",

            nat: "cyberpunk street photography, neon lights, night city, underground alternative fashion, urban alley with graffiti and posters",

            style: "stylized anime, cyberpunk, high contrast, glowing neon lighting, detailed environment",

            mood: "rebellious, edgy, mysterious, nocturnal",

            palette: "neon purple, electric blue, hot pink, deep shadows"
          }
        ];

        // Seleciona 4 pilares para a página atual
        const hourSeed = Math.floor(Date.now() / (1000 * 60 * 15)); // Muda a cada 15 min
        for (let i = 0; i < 4; i++) {
          const pillar = pillars[(page * 4 + i + hourSeed) % pillars.length];
          // Adicionamos ambos ao pool para garantir o mix
          queriesToFetch.push({ art: pillar.art, nat: pillar.nat });
        }
      } else {
        queriesToFetch.push({ art: cleanQ, nat: `${cleanQ} alternative fashion` });
      }

      this.logger.log(`Alpha Hybrid Mix [P${page}]: ${queriesToFetch.length} pillars active.`);

      // Parallel fetch for all pillars (Triple Engine: Lexica + Unsplash + SeaArt)
      const fetchPromises = queriesToFetch.flatMap((p: any) => {
        const artQuery = p.art + (p.style ? `, ${p.style}` : '') + (p.mood ? `, ${p.mood}` : '');
        const natQuery = p.nat + (p.style ? ` ${p.style}` : '') + (p.palette ? ` ${p.palette}` : '');

        return [
          this.fetchSeaArt(artQuery, page)
            .then(r => r.data || { items: [] })
            .catch(() => ({ items: [] })),
          this.fetchWithTimeout(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(natQuery)}&page=${page}&per_page=10`)
            .then(r => r.json().catch(() => ({ results: [] })))
            .catch(() => ({ results: [] })),
          this.fetchWithTimeout(`https://lexica.art/api/v1/search?q=${encodeURIComponent(page > 1 ? `${artQuery} version ${page}` : artQuery)}`)
            .then(r => r.json().catch(() => ({ images: [] })))
            .catch(() => ({ images: [] }))
        ];
      });

      const rawResults = await Promise.all(fetchPromises);
      const combined: any[] = [];

      rawResults.forEach((res, idx) => {
        const engineIdx = idx % 3;

        if (engineIdx === 0) { // SeaArt (Principal) - Quota Expandida
          (res.items || []).slice(0, 10).forEach((img: any) => combined.push({
            url: img.banner || img.cover || img.url,
            width: img.width, height: img.height,
            source: 'Artificial (SeaArt)', prompt: img.title || 'SeaArt Alpha Generation', color: '#ff0055'
          }));
        } else if (engineIdx === 1) { // Unsplash (Natural)
          (res.results || []).slice(0, 6).forEach((img: any) => combined.push({
            url: img.urls?.small || img.urls?.regular,
            width: img.width, height: img.height,
            source: 'Natural (Photo)', prompt: img.alt_description || img.description || 'Alpha Subculture', color: '#ffb300'
          }));
        } else { // Lexica (Secundário)
          (res.images || []).slice(0, 6).forEach((img: any) => combined.push({
            url: img.srcSmall || img.src,
            width: img.width, height: img.height,
            source: 'Artificial (Lexica)', prompt: img.prompt, color: '#00f2ff'
          }));
        }
      });

      if (combined.length === 0) throw new Error('Empty Alpha Mix (Network Failure)');

      // Fisher-Yates Shuffle for true visual variety
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }

      return combined;
    } catch (e) {
      this.logger.error(`Alpha Safety Mode Activated: ${e.message}`);
      // Devolve modo de segurança com baralhamento para não ser sempre igual
      return [...this.FALLBACK_GALLERY].sort(() => Math.random() - 0.5);
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
        // Motor de Relações: Busca conteúdos similares baseado no prompt da imagem (Paginado)
        const related = await this.getAestheticGallery(q || 'aesthetic', page);
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
