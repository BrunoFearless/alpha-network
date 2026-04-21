import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async streamProxy(targetUrl: string, res: Response) {
    if (!targetUrl || !targetUrl.startsWith('http')) {
       return res.status(400).send('Invalid Target URL');
    }

    try {
      this.logger.log(`Alpha Shield Breaker: Proxying -> ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,pt-PT;q=0.8,pt;q=0.7',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        }
      });

      const contentType = response.headers.get('content-type') || 'text/html';
      res.setHeader('Content-Type', contentType);
      
      // Explicitly ignoring anti-iframe headers to bypass restrictions.
      const bodyBuffer = await response.arrayBuffer();
      
      if (contentType.includes('text/html')) {
        let htmlStr = Buffer.from(bodyBuffer).toString('utf-8');
        
        // Base Tag Injection to correct all relative paths / CSS / JS / Images
        const originUrl = new URL(response.url).origin;
        // Se a url original tiver caminhos subdiretorios, o origin puro garante a base. Se quisemos o pathname base, usamos base do URL
        const basePathUrl = new URL('.', response.url).href; 
        
        const baseTag = `<base href="${basePathUrl}">`;
        
        if (htmlStr.match(/<head[^>]*>/i)) {
           htmlStr = htmlStr.replace(/(<head[^>]*>)/i, `$1\n${baseTag}`);
        } else {
           htmlStr = `<head>${baseTag}</head>\n` + htmlStr;
        }

        // Nuclear option: Remove all CSP meta tags injected into the HTML that trigger security blocks
        htmlStr = htmlStr.replace(/<meta[^>]+http-equiv=['"]Content-Security-Policy['"][^>]*>/gi, '');
        htmlStr = htmlStr.replace(/<meta[^>]+name=['"]Content-Security-Policy['"][^>]*>/gi, '');

        // Kill Framebusting scripts specifically (e.g. window.top !== window.self) 
        // We will rely heavily on iframe sandbox from the frontend.

        return res.send(htmlStr);
      }

      // Se por algum motivo o proxy for chamado para Assets diretos (Imagens, etc)
      return res.end(Buffer.from(bodyBuffer));
    } catch (e) {
      this.logger.error(`Proxy Error for ${targetUrl}: ${e.message}`);
      return res.status(500).send(`<html><body style="background:#0a0a0a; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
        <h2 style="color: #ff003c; margin-bottom: 5px;">Alpha Nexus Breached</h2>
        <p style="opacity:0.7">O servidor destilar não conseguiu penetrar nas defesas do site alvo.</p>
        <p style="opacity:0.3; font-size:11px;">${e.message}</p>
      </body></html>`);
    }
  }

  async proxyImage(imageUrl: string, referer: string, res: Response) {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).send('Invalid Image URL');
    }

    try {
      this.logger.log(`Alpha Image Shield: Proxying -> ${imageUrl} (Referer: ${referer})`);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': referer || new URL(imageUrl).origin,
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        // Second attempt with bare origin referer
        const bareReferer = new URL(imageUrl).origin + '/';
        const retryRes = await fetch(imageUrl, { 
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36', 
            'Referer': bareReferer 
          } 
        });
        if (retryRes.ok) {
           const contentType = retryRes.headers.get('content-type') || 'image/jpeg';
           res.setHeader('Content-Type', contentType);
           const buffer = await retryRes.arrayBuffer();
           return res.send(Buffer.from(buffer));
        }
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache aggressively
      
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (e) {
      this.logger.error(`Alpha Image Shield failed for ${imageUrl}: ${e.message}`);
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
          'Accept-Language': 'en-US,en;q=0.9,pt-PT;q=0.8,pt;q=0.7',
          'Referer': targetOrigin,
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      });

      if (!response.ok) {
        this.logger.warn(`Target ${targetUrl} returned status ${response.status}. Fallback required.`);
        return { 
          success: false, 
          error: `O site alvo bloqueou a leitura nativa (${response.status}). Tente a abertura externa.`,
          statusCode: response.status 
        };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
         return { success: false, error: 'Not an HTML page. Visual or binary content cannot be read natively.' };
      }

      const rawHtml = await response.text();
      
      const { JSDOM } = require('jsdom');
      const { Readability } = require('@mozilla/readability');

      const doc = new JSDOM(rawHtml, { url: targetUrl });
      const reader = new Readability(doc.window.document);
      const article = reader.parse();

      // ── Alpha Manga Scan Fallback ──────────────────────────────────
      const isMangaPotential = targetUrl.toLowerCase().includes('chapter') || 
                               targetUrl.toLowerCase().includes('manga') || 
                               targetUrl.toLowerCase().includes('read') ||
                               targetUrl.toLowerCase().includes('capitulo') ||
                               rawHtml.toLowerCase().includes('chapter') ||
                               rawHtml.toLowerCase().includes('manga-container') ||
                               rawHtml.toLowerCase().includes('vungdoc') ||
                               rawHtml.toLowerCase().includes('reading-content');
      
      const images: string[] = [];
      // Tentar encontrar o container principal primeiro
      const mangaContainers = Array.from(doc.window.document.querySelectorAll('#vungdoc, .vung-doc, .reader-area, #chapter-video, #readerarea, .read-content, .viewer-cnt, #images-container, .reading-content, .wp-manga-chapter-img'));
      
      // Se não achar container específico, varre o documento todo
      const elementsToScan = mangaContainers.length > 0 ? mangaContainers : [doc.window.document.body];
      
      elementsToScan.forEach((container: any) => {
         const foundImages = Array.from(container.querySelectorAll('img'));
         foundImages.forEach((img: any) => {
             let src = img.getAttribute('data-src') || 
                         img.getAttribute('data-lazy-src') || 
                         img.getAttribute('data-original') || 
                         img.getAttribute('data-actual-src') ||
                         img.getAttribute('data-cdn') ||
                         img.getAttribute('data-srcset')?.split(' ')[0] ||
                         img.getAttribute('srcset')?.split(' ')[0] ||
                         img.getAttribute('src');
                         
             if (!src) return;

             // Limpeza básica de URL
             src = src.trim();
             if (src.startsWith('//')) src = 'https:' + src;

             const isLikelyNav = src.toLowerCase().includes('logo') || 
                                 src.toLowerCase().includes('avatar') || 
                                 src.toLowerCase().includes('banner') || 
                                 src.toLowerCase().includes('icon') ||
                                 src.toLowerCase().includes('loading') ||
                                 src.toLowerCase().includes('button') ||
                                 src.toLowerCase().includes('social') ||
                                 src.toLowerCase().includes('ads') ||
                                 src.toLowerCase().includes('sidebar');

             if (!isLikelyNav) {
                try {
                   const absoluteUrl = new URL(src, targetUrl).href;
                   const proxyUrl = `/api/v1/lazer/proxy/image?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(targetUrl)}`;
                   if (!images.includes(proxyUrl)) images.push(proxyUrl);
                } catch {}
             }
          });
       });

      // ── Alpha Regex Deep Scan (Para leitores baseados em JS) ──────
      if (images.length < 5 && isMangaPotential) {
         this.logger.log(`Alpha Manga Scan: DOM scan yielded low results (${images.length}). Attempting Regex Deep Scan...`);
         
         // Procurar por padrões comuns de URLs de imagem em scripts ou JSON injetado
         // Ex: "https://.../page1.jpg", "url": "...", "src": "..."
         const imgRegex = /https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"']*)?/gi;
         const matches = rawHtml.match(imgRegex) || [];
         
         matches.forEach(match => {
            const isLikelyNav = match.toLowerCase().includes('logo') || 
                                match.toLowerCase().includes('avatar') || 
                                match.toLowerCase().includes('banner') || 
                                match.toLowerCase().includes('icon') ||
                                match.toLowerCase().includes('social') ||
                                match.toLowerCase().includes('ads');

            if (!isLikelyNav) {
               const proxyUrl = `/api/v1/lazer/proxy/image?url=${encodeURIComponent(match)}&referer=${encodeURIComponent(targetUrl)}`;
               if (!images.includes(proxyUrl)) images.push(proxyUrl);
            }
         });
      }

      // Se é potencial mangá e encontramos imagens, ignoramos o texto da Readability
      if ((isMangaPotential || images.length > 10) && images.length > 2) {
         this.logger.log(`Alpha Manga Scan: Final Extraction Report -> ${images.length} pages found for ${targetUrl}`);
         return {
            success: true,
            article: {
               title: article?.title || doc.window.document.title || 'Manga Chapter',
               content: `<div class="alpha-manga-native-container" style="display: flex; flex-direction: column; align-items: center; background: #000; min-height: 100vh; width: 100%;">
                  ${images.map(img => `<img src="${img}" style="width:100%; max-width:1100px; display:block; margin: 0 auto;" loading="lazy" />`).join('')}
               </div>`,
               textContent: 'Conteúdo visual detetado. Lendo no modo Manga Native...',
               siteName: new URL(targetUrl).hostname,
               isManga: true
            }
         };
      }

      if (!article || !article.content) {
        return { success: false, error: 'Readability could not extract content (maybe it is a modern SPA without SSR or extremely protected).' };
      }

      return { 
        success: true, 
        article: {
          title: article.title,
          byline: article.byline,
          dir: article.dir,
          content: article.content,
          textContent: article.textContent,
          length: article.length,
          siteName: article.siteName,
          excerpt: article.excerpt
        }
      };

    } catch (e) {
      this.logger.error(`Alpha Native Reader failed for ${targetUrl}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }
}
