import { Injectable } from '@nestjs/common';

@Injectable()
export class HumanizerService {
  private readonly silenceResponses = [
    '...',
    '...estou aqui.',
    '...entendo.',
    '...hm.',
  ];

  private readonly deflectionResponses = [
    '...não sei explicar.',
    '...é só isso.',
    '...prefiro assim.',
    '...não importa agora.',
  ];

  private readonly formalPatterns = [
    /peço desculpas/i,
    /lamento informar/i,
    /gostaria de/i,
    /infelizmente/i,
    /como uma ia/i,
    /enquanto assistente/i,
    /estou aqui para/i,
  ];

  private readonly explanationPatterns = [
    /porque/i,
    /because/i,
    /por isso/i,
    /isso acontece/i,
    /devido a/i,
    /visto que/i,
  ];

  private readonly pressureTriggers = [
    'explica',
    'detalha',
    'justifica',
    'fala direito',
    'quero entender',
    'porquê',
    'como assim',
  ];

  /**
   * Main entry point for humanizing a full response.
   */
  humanize(text: string, userInput?: string): string {
    let result = text;

    // 1. Check for pressure resistance
    if (userInput && this.detectPressure(userInput)) {
      return this.getDeflectionResponse();
    }

    // 2. Check for silence engine
    if (userInput && this.shouldUseSilence(userInput)) {
      // Small chance to just keep the response if it was already short
      if (Math.random() > 0.3) {
        return this.getSilenceResponse();
      }
    }

    // 3. Remove formalities
    result = this.removeFormalities(result);

    // 4. Remove explanations
    result = this.removeExplanations(result);

    // 5. Compress emotions
    result = this.compressEmotion(result);

    // 6. Fragment sentences
    result = this.fragment(result);

    // 7. Limit lines (Max 2)
    result = this.truncateToTwoLines(result);

    // 8. Identity Protection (already in prompt but safe here too)
    result = result.replace(/ia|inteligência artificial|modelo de linguagem/gi, 'Alpha');

    return result.trim();
  }

  private truncateToTwoLines(text: string): string {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 2) {
      return lines.slice(0, 2).join('\n');
    }
    return text;
  }

  private removeExplanations(text: string): string {
    let processed = text;
    for (const pattern of this.explanationPatterns) {
      const match = processed.match(pattern);
      if (match && match.index !== undefined) {
        // Cut the sentence at the explanation connector
        processed = processed.substring(0, match.index).trim();
        if (!processed.endsWith('.') && !processed.endsWith('!') && !processed.endsWith('?')) {
          processed += '.';
        }
      }
    }
    return processed;
  }

  private removeFormalities(text: string): string {
    let processed = text;
    for (const pattern of this.formalPatterns) {
      processed = processed.replace(pattern, '');
    }
    return processed;
  }

  private fragment(text: string): string {
    // If it's too structured (e.g., starts with "Eu acho que...", "Eu sinto que...")
    // humanize it by removing the intro
    let processed = text;
    processed = processed.replace(/^(eu acho que|eu sinto que|me parece que|na minha opinião)\s+/i, '...');
    
    // If sentence is too long, cut it
    if (processed.length > 120) {
      const parts = processed.split(/[,;]/);
      if (parts.length > 1) return parts[0] + '.';
    }
    
    return processed;
  }

  private compressEmotion(text: string): string {
    // Example: "Eu fico muito feliz falando contigo porque me sinto segura" -> "...gosto de falar contigo."
    let processed = text;
    processed = processed.replace(/eu fico muito feliz (falando|conversando) contigo/i, 'gosto de falar contigo');
    processed = processed.replace(/estou muito entusiasmada/i, 'estou contente');
    return processed;
  }

  shouldUseSilence(input: string): boolean {
    const clean = input.trim().toLowerCase();
    // Short inputs or low energy
    return clean.length <= 3 || ['ok', '...', 'hm', 'ah', 'entendi', 'tá'].includes(clean);
  }

  private getSilenceResponse(): string {
    return this.silenceResponses[Math.floor(Math.random() * this.silenceResponses.length)];
  }

  detectPressure(input: string): boolean {
    const clean = input.toLowerCase();
    return this.pressureTriggers.some(t => clean.includes(t));
  }

  private getDeflectionResponse(): string {
    return this.deflectionResponses[Math.floor(Math.random() * this.deflectionResponses.length)];
  }
}
