import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Groq } from 'groq-sdk';

@Injectable()
export class AlphaCoreService {
  private genAI: GoogleGenerativeAI;
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const geminiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    const groqKey = this.configService.get<string>('GROQ_API_KEY');

    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }

    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async generateReply(message: string, history: { role: string, content: string }[], systemPrompt: string, compactPrompt: string) {
    const groqKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    const geminiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY')?.trim();

    console.log(`[Alpha Core] Iniciando pedido: "${message.substring(0, 50)}..."`);

    // 1. Tentar Groq (Modo Turbo 70B)
    if (this.groq && groqKey) {
      try {
        console.log('[Alpha Core] -> Groq Llama-3.3-70b');
        return await this.executeGroqChat(message, history, systemPrompt, 'llama-3.3-70b-versatile', 8);
      } catch (error) {
        console.error('❌ Groq 70B Error:', error.message);
        if (error.message?.includes('429') || error.message?.includes('rate_limit')) {
          try {
            console.log('[Alpha Core] -> Groq Fallback 8b');
            return await this.executeGroqChat(message, history, compactPrompt, 'llama-3.1-8b-instant', 5);
          } catch (e) {
            console.error('❌ Groq 8B Fallback Error:', e.message);
          }
        }
      }
    }

    // 2. Tentar Gemini Flash
    if (this.genAI && geminiKey) {
      try {
        console.log('[Alpha Core] -> Gemini Flash');
        return await this.executeGeminiChat(message, history, systemPrompt, 'gemini-flash-latest', 8);
      } catch (error) {
        console.error('❌ Gemini Error:', error.message);
        if (error.message?.includes('503') || error.message?.includes('429')) {
          try {
            console.log('[Alpha Core] -> Gemini Fallback Lite');
            return await this.executeGeminiChat(message, history, compactPrompt, 'gemini-2.0-flash-lite', 5);
          } catch (e) {
            console.error('❌ Gemini Fallback Error:', e.message);
          }
        }
      }
    }

    throw new InternalServerErrorException('A Alpha está exausta (todos os motores falharam). Tenta novamente em segundos.');
  }

  private async executeGroqChat(message: string, history: { role: string, content: string }[], systemPrompt: string, modelName: string, historyLimit: number) {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-historyLimit).map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || ''
      })),
      { role: 'user', content: message }
    ];

    const tools = this.getToolDefinitions('groq');

    const response = await this.groq.chat.completions.create({
      model: modelName,
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log(`[Alpha Core] Groq chamou ferramenta: ${functionName}`);
      const toolResult = await this.handleToolCall(functionName, args);
      
      messages.push(responseMessage);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(toolResult)
      });

      const secondResponse = await this.groq.chat.completions.create({
        model: modelName,
        messages,
      });

      const finalContent = secondResponse.choices[0].message.content;
      console.log(`[Alpha Core] Resposta final (Groq): "${finalContent?.substring(0, 50)}..."`);
      return finalContent;
    }

    return responseMessage.content;
  }

  private async executeGeminiChat(message: string, history: { role: string, content: string }[], systemPrompt: string, modelName: string, historyLimit: number) {
    const tools = this.getToolDefinitions('gemini');

    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      tools: tools as any,
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: (history || []).slice(-historyLimit).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || ' ' }],
      })),
    });

    let result = await chat.sendMessage(message);
    let response = await result.response;

    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      const call = calls[0];
      console.log(`[Alpha Core] Gemini chamou ferramenta: ${call.name}`);
      const toolResult = await this.handleToolCall(call.name, call.args);
      
      result = await chat.sendMessage([{
        functionResponse: { name: call.name, response: { result: toolResult } }
      }]);
      response = await result.response;
    }

    const finalReply = response.text();
    console.log(`[Alpha Core] Resposta final (Gemini): "${finalReply.substring(0, 50)}..."`);
    return finalReply;
  }

  // ─── GESTÃO DE FERRAMENTAS (TOOLS) ─────────────────────────────────

  private getToolDefinitions(format: 'groq' | 'gemini') {
    const defs = [
      {
        name: 'search_user',
        description: 'Procura um utilizador na Alpha Network pelo seu username.',
        parameters: {
          type: 'object',
          properties: { username: { type: 'string', description: 'Username (ex: @bruno)' } },
          required: ['username']
        }
      },
      {
        name: 'get_trending_tropes',
        description: 'Obtém os temas (tropes) mais populares do momento no Modo Lazer.',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'get_communities',
        description: 'Lista comunidades no Modo Lazer da Alpha Network.',
        parameters: {
          type: 'object',
          properties: { search: { type: 'string', description: 'Pesquisa opcional' } }
        }
      },
      {
        name: 'get_watching_now',
        description: 'Lista o que os utilizadores estão a ver no momento (Check-ins).',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'get_suggested_friends',
        description: 'Sugere utilizadores para amizade (excluindo o utilizador actual).',
        parameters: { type: 'object', properties: {} }
      },
      // Fase 2 Tools
      {
        name: 'generate_image',
        description: 'Gera uma imagem criativa baseada numa descrição.',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Descrição visual detalhada' },
            style: { type: 'string', enum: ['anime', 'realistic', 'sketch', 'pixel_art', 'watercolor'] }
          },
          required: ['prompt']
        }
      }
    ];

    if (format === 'gemini') return [{ functionDeclarations: defs }];
    return defs.map(d => ({ type: 'function', function: d }));
  }

  private async handleToolCall(name: string, args: any) {
    console.log(`[Alpha Core] Executando: ${name}`, args);
    try {
      if (name === 'search_user') return await this.searchUserTool(args.username?.replace('@', ''));
      if (name === 'get_trending_tropes') return await this.getTrendingTropesTool();
      if (name === 'get_communities') return await this.getCommunitiesTool(args.search);
      if (name === 'get_watching_now') return await this.getWatchingNowTool();
      if (name === 'get_suggested_friends') return await this.getSuggestedFriendsTool();
      if (name === 'generate_image') return await this.generateImageTool(args.prompt, args.style);
    } catch (e) {
      console.error(`Erro ao executar ferramenta ${name}:`, e);
    }
    return { error: 'Falha ao obter dados.' };
  }

  private async generateImageTool(prompt: string, style: string = 'anime') {
    const togetherKey = this.configService.get<string>('TOGETHER_API_KEY');
    
    if (!togetherKey) {
      return { 
        url: `https://placehold.co/1024x1024/a78bfa/ffffff?text=${encodeURIComponent(prompt)}`,
        message: 'Modo demonstração: TOGETHER_API_KEY não configurada no servidor.'
      };
    }

    const stylePrompts = {
      anime: 'anime style, vibrant colors, detailed illustration, high quality',
      realistic: 'photorealistic, 8k, professional photography, dramatic lighting',
      sketch: 'pencil sketch, artistic, clean lines',
      pixel_art: 'pixel art, 16-bit, retro aesthetic',
      watercolor: 'watercolor painting, soft textures, artistic'
    };

    const fullPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.anime}`;

    try {
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${togetherKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell',
          prompt: fullPrompt,
          width: 1024,
          height: 1024,
          steps: 4,
          n: 1,
        }),
      });

      const data = await response.json();
      console.log('[Alpha Core] Together AI Response:', JSON.stringify(data, null, 2));

      if (response.ok && data.data?.[0]?.url) {
        return { url: data.data[0].url, prompt: fullPrompt };
      }
      
      throw new Error(data.error?.message || 'Together AI failed');
    } catch (e) {
      console.warn('⚠️ Together AI falhou, a usar Fallback Gratuito (Pollinations)...', e.message);
      
      // Fallback para Pollinations AI (Grátis, sem chave, excelente qualidade)
      const pollinationsUrl = `https://pollinations.ai/p/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&model=flux&seed=${Date.now()}`;
      
      return { 
        url: pollinationsUrl, 
        prompt: fullPrompt,
        note: 'Gerado via Fallback Gratuito (Pollinations AI)'
      };
    }
  }

  private async searchUserTool(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
      include: {
        user: {
          include: {
            lazerPosts: { take: 5, orderBy: { createdAt: 'desc' }, select: { content: true, createdAt: true } }
          }
        }
      }
    });
    if (!profile) return { error: `Utilizador @${username} não encontrado.` };
    return {
      id: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      status: profile.status,
      tags: profile.tags,
      activeModes: profile.activeModes,
      recentPosts: profile.user.lazerPosts
    };
  }

  private async getTrendingTropesTool() {
    return await this.prisma.lazerTropeTrend.findMany({
      take: 10,
      orderBy: { sparklesCount: 'desc' },
      select: { tropeId: true, sparklesCount: true, talkingCount: true }
    });
  }

  private async getCommunitiesTool(search?: string) {
    return await this.prisma.lazerCommunity.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      } : {},
      take: 10,
      select: { name: true, description: true, iconEmoji: true, inviteCode: true }
    });
  }

  private async getWatchingNowTool() {
    return await this.prisma.lazerCheckIn.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { title: true, episode: true, emoji: true, createdAt: true }
    });
  }

  private async getSuggestedFriendsTool() {
    return await this.prisma.profile.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { username: true, displayName: true, bio: true }
    });
  }
}
