import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AlphaCoreService } from './alpha-core.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('alpha-core')
export class AlphaCoreController {
  constructor(private readonly alphaCoreService: AlphaCoreService) {}

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(@Body() body: { message: string, history: any[], systemPrompt: string, compactPrompt?: string }) {
    const { message, history, systemPrompt, compactPrompt } = body;
    const reply = await this.alphaCoreService.generateReply(message, history, systemPrompt, compactPrompt || systemPrompt);
    return { reply };
  }
}
