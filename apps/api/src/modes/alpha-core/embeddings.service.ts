import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private pipeline: any;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initModel();
  }

  async onModuleInit() {
    await this.initPromise;
  }

  private async initModel() {
    try {
      const { pipeline } = await (eval('import("@xenova/transformers")') as Promise<any>);
      this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[EmbeddingsService] Modelo local carregado com sucesso.');
    } catch (e: any) {
      console.error('[EmbeddingsService] Erro ao carregar modelo local (pode ser falta de Sharp/C++ no Windows). Usaremos fallback Together AI:', e.message);
    }
  }

  async generate(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initPromise;
    }
    
    if (!this.pipeline) {
      return this.generateTogether(text);
    }

    try {
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data);
    } catch (e) {
      console.error('[EmbeddingsService] Local pipeline failed during generation, trying Together fallback...');
      return this.generateTogether(text);
    }
  }

  private async generateTogether(text: string): Promise<number[]> {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.warn('[EmbeddingsService] Together AI API key not found. Cannot generate embeddings.');
      return [];
    }

    try {
      const res = await fetch('https://api.together.xyz/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'togethercomputer/m2-bert-80M-32k-retrieval',
          input: text
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.data[0].embedding;
      } else {
        const err = await res.text();
        console.error('[EmbeddingsService] Together API error:', err);
      }
    } catch (e) {
      console.error('[EmbeddingsService] Together fallback failed:', e);
    }
    return [];
  }

  /**
   * Calcula a similaridade de cosseno entre dois vectores.
   */
  cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length || v1.length === 0) return 0;
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    
    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
