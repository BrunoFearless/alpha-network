import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../prisma.service';
import Groq from 'groq-sdk';

@Injectable()
export class AlphaCoreService implements OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {}

  async onModuleInit() {
    const geminiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY')?.trim();
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      console.log('✅ Alpha Core: Gemini SDK inicializado.');
    }

    const groqKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
      console.log('🚀 Alpha Core: Groq SDK (Modo Turbo) inicializado.');
    }
  }

  async generateReply(message: string, history: { role: string, content: string }[], systemPrompt: string) {
    const groqKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    const geminiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY')?.trim();

    // 1. Tentar Groq (Modo Turbo) primeiro se disponível
    if (this.groq && groqKey) {
      try {
        console.log('[Alpha Core] Gerando resposta via Groq (Turbo)...');
        return await this.executeGroqChat(message, history, systemPrompt);
      } catch (error) {
        console.error('❌ Alpha Core Groq Error:', error.message || error);
      }
    }

    // 2. Tentar Gemini se Groq falhou ou não existe
    if (this.genAI && geminiKey) {
      try {
        console.log('[Alpha Core] Gerando resposta via Gemini...');
        return await this.executeGeminiChat(message, history, systemPrompt, 'gemini-flash-latest');
      } catch (error) {
        console.error('❌ Alpha Core Gemini Error:', error.message || error);
        
        if (error.message?.includes('503') || error.message?.includes('429')) {
          try {
            return await this.executeGeminiChat(message, history, systemPrompt, 'gemini-2.0-flash-lite');
          } catch (e) {
            console.error('❌ Alpha Core Gemini Fallback Error:', e.message);
          }
        }
      }
    }

    throw new InternalServerErrorException('Todos os motores de IA estão temporariamente indisponíveis.');
  }

  // ─── IMPLEMENTAÇÃO GROQ ─────────────────────────────────────────────

  private async executeGroqChat(message: string, history: { role: string, content: string }[], systemPrompt: string) {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const tools = this.getToolDefinitions('groq');

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 1024,
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      const toolResult = await this.handleToolCall(functionName, args);
      
      if (toolResult) {
        messages.push(responseMessage);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(toolResult)
        });

        const secondResponse = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.7
        });

        return secondResponse.choices[0].message.content;
      }
    }

    // Fallback Regex para Llama hallucination
    if (responseMessage.content?.includes('<function=')) {
      const match = responseMessage.content.match(/<function=(\w+)(.*)>/);
      if (match) {
        const functionName = match[1];
        try {
          const args = JSON.parse(match[2].trim() || '{}');
          const toolResult = await this.handleToolCall(functionName, args);
          
          messages.push({ role: 'assistant', content: responseMessage.content });
          messages.push({ role: 'user', content: `Resultado da ferramenta: ${JSON.stringify(toolResult)}` });

          const thirdResponse = await this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7
          });
          return thirdResponse.choices[0].message.content;
        } catch (e) {}
      }
    }

    return responseMessage.content;
  }

  // ─── IMPLEMENTAÇÃO GEMINI ──────────────────────────────────────────

  private async executeGeminiChat(message: string, history: { role: string, content: string }[], systemPrompt: string, modelName: string) {
    const tools = this.getToolDefinitions('gemini');

    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      tools: tools as any,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
    });

    let result = await chat.sendMessage(message);
    let response = await result.response;

    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      const call = calls[0];
      const functionName = call.name;
      const args = call.args as any;
      
      const toolResult = await this.handleToolCall(functionName, args);
      
      result = await chat.sendMessage([{
        functionResponse: { name: functionName, response: { content: toolResult } }
      }]);
      response = await result.response;
    }

    return response.text();
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
    } catch (e) {
      return 'Erro ao aceder à base de dados.';
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
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
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
}
