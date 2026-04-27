import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class AlphaMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService
  ) {}

  /**
   * Grava uma nova memória ou facto sobre o utilizador
   */
  async saveMemory(aiId: string, content: string, type: string = 'fact', importance: number = 1) {
    const embedding = await this.embeddings.generate(content);
    
    return this.prisma.alphaAiMemory.create({
      data: {
        aiId,
        content,
        type,
        importance,
        embedding,
      },
    });
  }

  /**
   * Recupera memórias relevantes com base no conteúdo da mensagem atual
   * Por agora usa uma pesquisa de texto simples (keywords)
   */
  async getRelevantMemories(aiId: string, query: string) {
    const queryEmbedding = await this.embeddings.generate(query);
    
    // Busca todas as memórias da IA
    const allMemories = await this.prisma.alphaAiMemory.findMany({
      where: { aiId },
    });

    if (allMemories.length === 0) return [];

    // Calcula similaridade e ordena
    const scoredMemories = allMemories
      .map(m => ({
        ...m,
        score: this.embeddings.cosineSimilarity(queryEmbedding, m.embedding as number[])
      }))
      .filter(m => m.score > 0.4) // Threshold de relevância
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scoredMemories;
  }

  /**
   * Tenta extrair factos de uma mensagem e gravá-los automaticamente
   * Ex: "Eu gosto de azul" -> Facto: Utilizador gosta de azul
   */
  async extractAndSaveFacts(aiId: string, message: string) {
    // Lógica simples de extração baseada em padrões comuns
    // Em produção, isto seria feito por um modelo LLM mais pequeno
    const patterns = [
      { regex: /meu nome é (.*)/i, type: 'identity' },
      { regex: /gosto de (.*)/i, type: 'preference' },
      { regex: /não gosto de (.*)/i, type: 'dislike' },
      { regex: /aniversário é (.*)/i, type: 'date' },
      { regex: /moro em (.*)/i, type: 'location' }
    ];

    for (const p of patterns) {
      const match = message.match(p.regex);
      if (match && match[1]) {
        await this.saveMemory(aiId, `Utilizador ${p.type}: ${match[1].trim()}`, p.type, 3);
      }
    }
  }

  private extractKeywords(text: string): string[] {
    // Remove stop words comuns e pontuação
    const words = text.toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    return Array.from(new Set(words));
  }
}
