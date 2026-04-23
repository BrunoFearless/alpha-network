import { Injectable, Logger } from '@nestjs/common';
import { Response, Request } from 'express';
import { Readable } from 'stream';

// Universal domain sanitizer - converts any bad AnimeFire TLD to .cv
function sanitizeDomain(url: string): string {
  if (url.includes('animefire')) {
    return url.replace(/animefire\.(?:lat|plus|tv|net|info|io|me|online|app|vip|club|top|xyz|site|co)/g, 'animefire.cv');
  }
  return url;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async streamProxy(targetUrl: string, res: Response, req?: Request) {
    if (!targetUrl || !targetUrl.startsWith('http')) {
       return res.status(400).send('Invalid Target URL');
    }

    // 🏮 Sanitize domain before any network call
    targetUrl = sanitizeDomain(targetUrl);

    try {
      this.logger.log(`Alpha Shield Breaker: Proxying -> ${targetUrl}`);
      
      const fetchHeaders: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': new URL(targetUrl).origin + '/',
        'Cache-Control': 'no-cache',
      };

      // 📡 Forward Range header for media streaming stability
      if (req?.headers?.range) {
        fetchHeaders['Range'] = req.headers.range;
      }

      const response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: fetchHeaders
      });

      const contentType = response.headers.get('content-type') || 'text/html';
      
      // 🛡️ Strip anti-iframe response headers and set CORS
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Content-Security-Policy');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 📺 Forward media-specific headers for native player compatibility
      const forwardHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
      forwardHeaders.forEach(h => {
        const val = response.headers.get(h);
        if (val) res.setHeader(h, val);
      });

      // Handle HTTP status (e.g. 206 Partial Content)
      res.status(response.status);

      // ─ HTML Processing ──────────────────────────────────────────
      if (contentType.includes('text/html')) {
        const bodyBuffer = await response.arrayBuffer();
        let htmlStr = Buffer.from(bodyBuffer).toString('utf-8');
        
        // Inject base tag so all relative URLs resolve correctly
        const basePathUrl = new URL('.', response.url).href;
        const baseTag = `<base href="${basePathUrl}">`;
        if (htmlStr.match(/<head[^>]*>/i)) {
           htmlStr = htmlStr.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
        } else {
           htmlStr = `<head>${baseTag}</head>\n` + htmlStr;
        }

        // Remove CSP and X-Frame-Options meta tags
        htmlStr = htmlStr.replace(/<meta[^>]+http-equiv=['"]Content-Security-Policy['"][^>]*>/gi, '');
        htmlStr = htmlStr.replace(/<meta[^>]+name=['"]Content-Security-Policy['"][^>]*>/gi, '');
        htmlStr = htmlStr.replace(/<meta[^>]+http-equiv=['"]X-Frame-Options['"][^>]*>/gi, '');
        // Neutralize framebusting JS
        htmlStr = htmlStr.replace(/if\s*\(\s*(?:window\.top|top|window\.self|self)\s*[!=]==?\s*(?:window\.self|self|window|window\.top|top)\s*\)/gi, 'if(false)');

        return res.send(htmlStr);
      }

      // ─ Binary/Media Piping ──────────────────────────────────────
      const body = response.body;
      if (body) {
        // @ts-ignore - Readable.fromWeb is available in modern Node.js
        const nodeStream = Readable.fromWeb(body);
        nodeStream.pipe(res);
        return;
      }

      return res.end();
    } catch (e) {
      this.logger.error(`Proxy Error for ${targetUrl}: ${e.message}`);
      return res.status(500).send(`<html><body style="background:#0a0a0a; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
        <h2 style="color: #ff003c;">Alpha Nexus Breached</h2>
        <p style="opacity:0.7">Não foi possível aceder à fonte através do shield.</p>
        <p style="opacity:0.3; font-size:11px;">${e.message}</p>
      </body></html>`);
    }
  }

  async proxyImage(imageUrl: string, referer: string, res: Response) {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).send('Invalid Image URL');
    }

    try {
      this.logger.log(`Alpha Image Shield: Proxying -> ${imageUrl}`);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': referer || new URL(imageUrl).origin,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        const retryRes = await fetch(imageUrl, { 
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', 
            'Referer': new URL(imageUrl).origin + '/'
          } 
        });
        if (retryRes.ok) {
           const ct = retryRes.headers.get('content-type') || 'image/jpeg';
           res.setHeader('Content-Type', ct);
           return res.send(Buffer.from(await retryRes.arrayBuffer()));
        }
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      this.logger.error(`Alpha Image Shield failed: ${e.message}`);
      return res.status(500).send('Image Shield Breach');
    }
  }

  async extractArticle(targetUrl: string) {
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { success: false, error: 'Invalid URL' };
    }

    try {
      this.logger.log(`Alpha Native Reader: Extracting -> ${targetUrl}`);
      
      const targetOrigin = new URL(targetUrl).origin;
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': targetOrigin,
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        return { success: false, error: `Erro ${response.status} ao ler a página.` };
      }

      const rawHtml = await response.text();
      const { JSDOM } = require('jsdom');
      const { Readability } = require('@mozilla/readability');

      const doc = new JSDOM(rawHtml, { url: targetUrl });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();

      const isMangaPotential = (
        targetUrl.toLowerCase().includes('chapter') || 
        targetUrl.toLowerCase().includes('manga') || 
        targetUrl.toLowerCase().includes('read') ||
        targetUrl.toLowerCase().includes('capitulo')
      );
      
      const images: string[] = [];
      const mangaContainers = Array.from(doc.window.document.querySelectorAll('#vungdoc, .vung-doc, .reader-area, #chapter-video, #readerarea, .read-content, .viewer-cnt, #images-container, .reading-content, .wp-manga-chapter-img'));
      const elementsToScan = mangaContainers.length > 0 ? mangaContainers : [doc.window.document.body];
      
      elementsToScan.forEach((container: any) => {
         Array.from(container.querySelectorAll('img')).forEach((img: any) => {
             const src = img.getAttribute('data-src') || img.getAttribute('src');
             if (!src) return;
             try {
                const absoluteUrl = new URL(src, targetUrl).href;
                const proxyUrl = `/api/v1/lazer/proxy/image?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(targetUrl)}`;
                if (!images.includes(proxyUrl)) images.push(proxyUrl);
             } catch {}
          });
       });

      if ((isMangaPotential || images.length > 10) && images.length > 2) {
         return {
            success: true,
            article: {
               title: article?.title || doc.window.document.title || 'Manga Chapter',
               content: `<div class="alpha-manga-native-container" style="display:flex;flex-direction:column;align-items:center;background:#000;min-height:100vh;width:100%;">
                  ${images.map(img => `<img src="${img}" style="width:100%;max-width:1100px;display:block;margin:0 auto;" />`).join('')}
               </div>`,
               siteName: new URL(targetUrl).hostname,
               isManga: true
            }
         };
      }

      if (!article || !article.content) {
        return { success: false, error: 'Não foi possível extrair o conteúdo desta página.' };
      }

      return { 
        success: true, 
        article: {
          title: article.title,
          content: article.content,
          siteName: article.siteName
        }
      };

    } catch (e) {
      this.logger.error(`Alpha Native Reader failed: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  async extractVideo(targetUrl: string) {
    if (!targetUrl) return { success: false, error: 'Missing target' };

    try {
       // 🏮 Alpha Domain Sanitizer (covers ALL known bad TLDs)
       targetUrl = sanitizeDomain(targetUrl);

       // ── Alpha Video Search Fallback (when given a title, not a URL) ─
       if (!targetUrl.startsWith('http')) {
          this.logger.log(`Alpha Video Bridge: Searching -> ${targetUrl}`);
          let foundUrl = '';
          try {
             const baseHost = 'https://animefire.cv';
             const searchUrl = `${baseHost}/pesquisar/${encodeURIComponent(targetUrl)}`;
             const searchRes = await fetch(searchUrl, {
               headers: {
                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                 'Referer': baseHost,
               }
             });
             const searchHtml = await searchRes.text();
             const { JSDOM } = require('jsdom');
             const searchDoc = new JSDOM(searchHtml).window.document;
             const firstResult = searchDoc.querySelector('.video-block a, .article-anime a');
             if (firstResult) {
                foundUrl = new URL(firstResult.getAttribute('href'), baseHost).href;
             }
          } catch {}
          if (foundUrl) targetUrl = foundUrl;
          else return { success: false, error: 'Nenhum resultado encontrado nas fontes nativas.' };
       }

       this.logger.log(`Alpha Video Bridge: Extracting -> ${targetUrl}`);
       
       const response = await fetch(targetUrl, {
          redirect: 'follow',
          headers: {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
             'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
             'Referer': new URL(targetUrl).origin + '/',
          }
       });

       if (!response.ok) throw new Error(`Status ${response.status}`);
       
       const rawHtml = await response.text();
       const { JSDOM } = require('jsdom');
       const doc = new JSDOM(rawHtml, { url: targetUrl });

       let videoUrl = '';
       let videoType: 'raw' | 'iframe' = 'raw';
       let episodes: any[] = [];
       const title = doc.window.document.title || 'Alpha Video';

       // ── Anime Fire / Mirror Logic ───────────────────────────────────
       if (targetUrl.includes('animefire') || targetUrl.includes('flix2day')) {
          // Try DOM first
          const videoTag = doc.window.document.querySelector('video source, video, #video-player');
          if (videoTag) {
             videoUrl = videoTag.getAttribute('src') || videoTag.getAttribute('data-video-src') || '';
          }

          // Deep Regex Scan for hidden/obfuscated URLs
          if (!videoUrl) {
             const videoRegex = /https?:\/\/[^"']+\.(?:mp4|m3u8|webm)(?:\?[^"']*)?/gi;
             const playerRegex = /https?:\/\/[^"']+\/(?:player|embed|video|v)\/[^"']+/gi;
             const matches = [...(rawHtml.match(videoRegex) || []), ...(rawHtml.match(playerRegex) || [])];
             videoUrl = matches.find(m => !m.includes('thumb') && !m.includes('poster') && !m.includes('favicon')) || '';
             if (videoUrl && (videoUrl.includes('player') || videoUrl.includes('embed'))) videoType = 'iframe';
          }

          // Extract episode list
          const epLinks = Array.from(doc.window.document.querySelectorAll('#div_lista_episodios a, .episodios-list a, .list-episodes a, .episode-item a, .lista_episodios a, .all_episodios a, .video-block a'));
          episodes = epLinks.map((a: any) => {
            const href = a.getAttribute('href');
            if (!href) return null;
            try {
              return {
                title: a.textContent.trim().replace(/\s+/g, ' '),
                url: new URL(href, targetUrl).href
              };
            } catch { return null; }
          }).filter((ep: any) => ep && ep.url !== targetUrl && (ep.url.includes('/video/') || ep.url.includes('/episodio/')));
       }

       // Generic fallback
       if (!videoUrl) {
          const anyVideo = doc.window.document.querySelector('video, iframe[src*="video"], iframe[src*="player"]');
          if (anyVideo) {
             videoUrl = anyVideo.getAttribute('src') || '';
             videoType = anyVideo.tagName.toLowerCase() === 'iframe' ? 'iframe' : 'raw';
          }
       }

       return {
          success: true,
          video: {
             url: videoUrl,
             type: videoType,
             title,
             episodes: episodes.slice(0, 50),
             source: new URL(targetUrl).hostname
          }
       };

    } catch (e) {
       this.logger.error(`Alpha Video Bridge failed: ${e.message}`);
       return { success: false, error: e.message };
    }
  }
}
