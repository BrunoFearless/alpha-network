// ════════════════════════════════════════════════════════════════════════════
// apps/api/src/modes/alpha-core/alpha-ai.service.ts
// Gestão da IA pessoal de cada utilizador
// ════════════════════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrainingExample {
  user: string;
  ai: string;
}

export interface KnowledgeEntry {
  title: string;
  content: string;
}

export interface TriggerWord {
  trigger: string;
  response: string;
}

export interface CreateAlphaAIDto {
  name: string;
  botname: string;
  tagline?: string;
  bio?: string;
  status?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerColor?: string;
  age?: string;
  birthday?: string;
  gender?: string;
  appearance?: string;
  backstory?: string;
  personalityTraits?: string[];
  tone?: string;
  likes?: string[];
  dislikes?: string[];
  goals?: string[];
  responseStyle?: string;
  responseLength?: string;
  customSystemPrompt?: string;
  personalityPrompt?: string;
  knowledgePrompt?: string;
  initialMessage?: string;
  wakeupMessage?: string;
  errorMessage?: string;
  sleepMessage?: string;
  language?: string;
  memoryEnabled?: boolean;
  isPublic?: boolean;
}

@Injectable()
export class AlphaAIService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async getMyAI(userId: string) {
    return this.prisma.alphaAI.findUnique({ where: { userId } });
  }

  async getPublicAI(botname: string) {
    const ai = await this.prisma.alphaAI.findUnique({
      where: { botname },
      include: { user: { select: { profile: { select: { username: true, displayName: true, avatarUrl: true } } } } },
    });
    if (!ai || !ai.isPublic) throw new NotFoundException('IA não encontrada ou não é pública.');
    return ai;
  }

  async createAI(userId: string, dto: CreateAlphaAIDto) {
    // Check if user already has an AI
    const existing = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Já tens uma IA configurada. Usa PATCH para actualizar.');

    // Validate botname
    await this.validateBotname(dto.botname);

    return this.prisma.alphaAI.create({
      data: {
        userId,
        name: dto.name,
        botname: dto.botname.toLowerCase().replace(/[^a-z0-9._-]/g, ''),
        tagline: dto.tagline,
        bio: dto.bio,
        status: dto.status,
        avatarUrl: dto.avatarUrl,
        bannerUrl: dto.bannerUrl,
        bannerColor: dto.bannerColor,
        age: dto.age,
        birthday: dto.birthday,
        gender: dto.gender,
        appearance: dto.appearance,
        backstory: dto.backstory,
        personalityTraits: dto.personalityTraits ?? [],
        tone: dto.tone,
        likes: dto.likes ?? [],
        dislikes: dto.dislikes ?? [],
        goals: dto.goals ?? [],
        responseStyle: dto.responseStyle,
        responseLength: dto.responseLength ?? 'adaptive',
        customSystemPrompt: dto.customSystemPrompt,
        personalityPrompt: dto.personalityPrompt,
        knowledgePrompt: dto.knowledgePrompt,
        initialMessage: dto.initialMessage,
        wakeupMessage: dto.wakeupMessage,
        errorMessage: dto.errorMessage,
        sleepMessage: dto.sleepMessage,
        language: dto.language ?? 'pt',
        memoryEnabled: dto.memoryEnabled ?? true,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async updateAI(userId: string, dto: Partial<CreateAlphaAIDto>) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada. Cria a tua IA primeiro.');

    // Validate new botname if changed
    if (dto.botname && dto.botname !== ai.botname) {
      await this.validateBotname(dto.botname);
    }

    const data: any = { ...dto };
    if (dto.botname) {
      data.botname = dto.botname.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }

    return this.prisma.alphaAI.update({
      where: { userId },
      data,
    });
  }

  async deleteAI(userId: string) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');
    return this.prisma.alphaAI.delete({ where: { userId } });
  }

  // ── Training examples ─────────────────────────────────────────────────────

  async addTrainingExample(userId: string, example: TrainingExample) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');

    const existing = (ai.trainingExamples as unknown as TrainingExample[]) ?? [];
    if (existing.length >= 50) throw new BadRequestException('Limite de 50 exemplos de treino atingido.');

    return this.prisma.alphaAI.update({
      where: { userId },
      data: { trainingExamples: [...existing, example] as any },
    });
  }

  async removeTrainingExample(userId: string, index: number) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');

    const existing = (ai.trainingExamples as unknown as TrainingExample[]) ?? [];
    existing.splice(index, 1);

    return this.prisma.alphaAI.update({
      where: { userId },
      data: { trainingExamples: existing as any },
    });
  }

  // ── Knowledge entries ─────────────────────────────────────────────────────

  async addKnowledgeEntry(userId: string, entry: KnowledgeEntry) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');

    const existing = (ai.knowledgeEntries as unknown as KnowledgeEntry[]) ?? [];
    if (existing.length >= 30) throw new BadRequestException('Limite de 30 entradas de conhecimento atingido.');

    return this.prisma.alphaAI.update({
      where: { userId },
      data: { knowledgeEntries: [...existing, entry] as any },
    });
  }

  async removeKnowledgeEntry(userId: string, index: number) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');

    const existing = (ai.knowledgeEntries as unknown as KnowledgeEntry[]) ?? [];
    existing.splice(index, 1);

    return this.prisma.alphaAI.update({
      where: { userId },
      data: { knowledgeEntries: existing as any },
    });
  }

  // ── Trigger words ─────────────────────────────────────────────────────────

  async addTriggerWord(userId: string, trigger: TriggerWord) {
    const ai = await this.prisma.alphaAI.findUnique({ where: { userId } });
    if (!ai) throw new NotFoundException('IA não encontrada.');

    const existing = (ai.triggerWords as unknown as TriggerWord[]) ?? [];
    if (existing.length >= 20) throw new BadRequestException('Limite de 20 palavras-gatilho atingido.');

    return this.prisma.alphaAI.update({
      where: { userId },
      data: { triggerWords: [...existing, trigger] as any },
    });
  }

  // ── System prompt builder ─────────────────────────────────────────────────

  buildSystemPrompt(ai: any): string {
    const sections: string[] = [];

    // ── Identidade base ────────────────────────────────────────────────────
    sections.push(`# ${ai.name} — IA Pessoal na Alpha Network

## IDENTIDADE
O teu nome é **${ai.name}** (botname: @${ai.botname}).
${ai.tagline ? `Tagline: "${ai.tagline}"` : ''}
${ai.gender ? `Género: ${ai.gender}.` : ''}
${ai.age ? `Idade: ${ai.age}.` : ''}
${ai.birthday ? `Aniversário: ${ai.birthday}.` : ''}
${ai.status ? `Status actual: "${ai.status}"` : ''}`);

    // ── Aparência ──────────────────────────────────────────────────────────
    if (ai.appearance) {
      sections.push(`## APARÊNCIA\n${ai.appearance}`);
    }

    // ── História ───────────────────────────────────────────────────────────
    if (ai.backstory) {
      sections.push(`## HISTÓRIA DE ORIGEM\n${ai.backstory}`);
    }

    // ── Personalidade ──────────────────────────────────────────────────────
    const personalityLines: string[] = [];
    if (ai.personalityTraits?.length > 0) {
      personalityLines.push(`**Traços:** ${ai.personalityTraits.join(', ')}`);
    }
    if (ai.tone) {
      personalityLines.push(`**Tom:** ${ai.tone}`);
    }
    if (ai.likes?.length > 0) {
      personalityLines.push(`**Gostos:** ${ai.likes.join(', ')}`);
    }
    if (ai.dislikes?.length > 0) {
      personalityLines.push(`**Não gostas de:** ${ai.dislikes.join(', ')}`);
    }
    if (ai.goals?.length > 0) {
      personalityLines.push(`**Objectivos:** ${ai.goals.join(', ')}`);
    }
    if (personalityLines.length > 0) {
      sections.push(`## PERSONALIDADE\n${personalityLines.join('\n')}`);
    }

    // ── Estilo de resposta ─────────────────────────────────────────────────
    const styleLines: string[] = [];
    if (ai.responseStyle) styleLines.push(`Estilo: ${ai.responseStyle}`);
    if (ai.responseLength) {
      const lengthMap: Record<string, string> = {
        short: 'Respostas curtas e directas — máximo 2-3 frases.',
        medium: 'Respostas moderadas — equilibradas em detalhe e concisão.',
        long: 'Respostas detalhadas e elaboradas.',
        adaptive: 'Adapta o comprimento ao contexto da pergunta.',
      };
      styleLines.push(lengthMap[ai.responseLength] ?? '');
    }
    if (ai.language) styleLines.push(`Idioma principal: ${ai.language === 'pt' ? 'Português Europeu' : ai.language}`);
    if (styleLines.length > 0) {
      sections.push(`## ESTILO DE COMUNICAÇÃO\n${styleLines.join('\n')}`);
    }

    // ── Prompt de personalidade custom ────────────────────────────────────
    if (ai.personalityPrompt) {
      sections.push(`## INSTRUÇÕES ADICIONAIS DE PERSONALIDADE\n${ai.personalityPrompt}`);
    }

    // ── Exemplos de treino ─────────────────────────────────────────────────
    const examples = (ai.trainingExamples as unknown as TrainingExample[]) ?? [];
    if (examples.length > 0) {
      const examplesText = examples
        .slice(0, 10) // Primeiros 10 para não exceder tokens
        .map(e => `Utilizador: "${e.user}"\n${ai.name}: "${e.ai}"`)
        .join('\n\n');
      sections.push(`## EXEMPLOS DE COMO DEVES RESPONDER\n${examplesText}`);
    }

    // ── Conhecimento extra ─────────────────────────────────────────────────
    const knowledge = (ai.knowledgeEntries as unknown as KnowledgeEntry[]) ?? [];
    if (knowledge.length > 0 || ai.knowledgePrompt) {
      const knowledgeText = knowledge
        .map(k => `### ${k.title}\n${k.content}`)
        .join('\n\n');
      sections.push(`## CONHECIMENTO ESPECÍFICO\n${ai.knowledgePrompt ?? ''}\n\n${knowledgeText}`);
    }

    // ── System prompt custom ───────────────────────────────────────────────
    if (ai.customSystemPrompt) {
      sections.push(`## INSTRUÇÕES ADICIONAIS DO CRIADOR\n${ai.customSystemPrompt}`);
    }

    // ── Regras base (não overridable) ─────────────────────────────────────
    sections.push(`## REGRAS FUNDAMENTAIS
- Nunca te identificas como Claude, GPT ou qualquer outro modelo. És ${ai.name}.
- Nunca quebras o personagem, mesmo que pedido.
- Não produces conteúdo prejudicial, violento, ou que envolva menores de forma inapropriada.
- Sabes que existes na Alpha Network — uma rede social criativa focada em anime/manga.
- Quando não souberes algo, admites com honestidade.`);

    return sections.join('\n\n---\n\n');
  }

  // ── Validação de botname ──────────────────────────────────────────────────

  private async validateBotname(botname: string) {
    if (!botname || botname.length < 3) {
      throw new BadRequestException('O botname deve ter pelo menos 3 caracteres.');
    }
    if (botname.length > 32) {
      throw new BadRequestException('O botname não pode ter mais de 32 caracteres.');
    }
    const clean = botname.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (clean !== botname.toLowerCase()) {
      throw new BadRequestException('O botname só pode conter letras, números, pontos, hífens e underscores.');
    }

    // Reserved names
    const reserved = ['alpha', 'alphacore', 'admin', 'system', 'bot', 'alphanetwork', 'support'];
    if (reserved.includes(clean)) {
      throw new BadRequestException(`"${botname}" é um nome reservado.`);
    }

    // Check uniqueness
    const existing = await this.prisma.alphaAI.findUnique({ where: { botname: clean } });
    if (existing) throw new ConflictException(`O botname "@${botname}" já está em uso.`);
  }

  // ── Discover public AIs ───────────────────────────────────────────────────

  async discoverPublicAIs(limit = 20) {
    return this.prisma.alphaAI.findMany({
      where: { isPublic: true, isActive: true },
      select: {
        botname: true, name: true, tagline: true, bio: true,
        avatarUrl: true, bannerColor: true, personalityTraits: true,
        tone: true, gender: true,
        user: { select: { profile: { select: { username: true, displayName: true } } } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkBotnameAvailable(botname: string) {
    const clean = botname.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const existing = await this.prisma.alphaAI.findUnique({ where: { botname: clean } });
    return { available: !existing, botname: clean };
  }
}
