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
        // Se falhar, tenta Gemini como fallback
      }
    }

    // 2. Tentar Gemini se Groq falhou ou não existe
    if (this.genAI && geminiKey) {
      try {
        return await this.executeGeminiChat(message, history, systemPrompt, 'gemini-flash-latest');
      } catch (error) {
        console.error('❌ Alpha Core Gemini Error:', error.message || error);
        
        // Fallback Gemini Lite
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

    const tools = [
      {
        type: 'function',
        function: {
          name: 'search_user',
          description: 'Procura um utilizador na Alpha Network pelo seu username.',
          parameters: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Username (ex: @bruno)' }
            },
            required: ['username']
          }
        }
      }
    ];

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 1024,
    });

    const responseMessage = response.choices[0].message;

    // Lidar com Tool Calls (Standard JSON)
    if (responseMessage.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      if (toolCall.function.name === 'search_user') {
        const args = JSON.parse(toolCall.function.arguments);
        const username = args.username.replace('@', '');
        console.log(`[Alpha Core - Groq] Tool Search: @${username}`);
        
        const userData = await this.searchUserTool(username);
        
        messages.push(responseMessage);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: 'search_user',
          content: JSON.stringify(userData)
        });

        const secondResponse = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.7
        });

        return secondResponse.choices[0].message.content;
      }
    }

    // Fallback caso o modelo use o formato <function=... (hallucination comum em alguns modelos Groq)
    if (responseMessage.content?.includes('<function=')) {
      console.log('[Alpha Core - Groq] Detectado formato de função não-padrão. Corrigindo...');
      const match = responseMessage.content.match(/<function=(\w+)(.*)>/);
      if (match && match[1] === 'search_user') {
        try {
          const argsRaw = match[2].trim();
          const args = JSON.parse(argsRaw);
          const userData = await this.searchUserTool(args.username.replace('@', ''));
          
          messages.push({ role: 'assistant', content: responseMessage.content });
          messages.push({ role: 'user', content: `Resultado da ferramenta: ${JSON.stringify(userData)}` });

          const thirdResponse = await this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7
          });
          return thirdResponse.choices[0].message.content;
        } catch (e) {
          console.error('Falha ao processar função customizada');
        }
      }
    }

    return responseMessage.content;
  }

  // ─── IMPLEMENTAÇÃO GEMINI ──────────────────────────────────────────

  private async executeGeminiChat(message: string, history: { role: string, content: string }[], systemPrompt: string, modelName: string) {
    const tools = [{
      functionDeclarations: [{
        name: 'search_user',
        description: 'Procura um utilizador na Alpha Network pelo seu username.',
        parameters: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username (ex: @bruno)' }
          },
          required: ['username']
        }
      }]
    }];

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
      if (call.name === 'search_user') {
        const username = (call.args as any).username.replace('@', '');
        const userData = await this.searchUserTool(username);
        result = await chat.sendMessage([{
          functionResponse: { name: 'search_user', response: { content: userData } }
        }]);
        response = await result.response;
      }
    }

    return response.text();
  }

  // ─── FERRAMENTAS COMUNS ────────────────────────────────────────────

  private async searchUserTool(username: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { username },
        include: {
          user: {
            include: {
              lazerPosts: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { content: true, createdAt: true }
              }
            }
          }
        }
      });

      if (!profile) return `Utilizador @${username} não encontrado.`;

      return {
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        status: profile.status,
        tags: profile.tags,
        activeModes: profile.activeModes,
        avatarUrl: profile.avatarUrl,
        postCount: profile.user.lazerPosts.length,
        recentPosts: profile.user.lazerPosts
      };
    } catch (e) {
      console.error('Search User Tool Error:', e);
      return 'Erro ao aceder à base de dados.';
    }
  }
}
