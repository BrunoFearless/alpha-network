import { Controller, Get, Post, Body, UseGuards, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async getConversations(@CurrentUser('id') userId: string) {
    const data = await this.chatService.getConversations(userId);
    return { success: true, data };
  }

  @Post('conversations')
  async createConversation(@CurrentUser('id') userId: string, @Body() dto: CreateConversationDto) {
    const data = await this.chatService.createConversation(userId, dto);
    return { success: true, data };
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.chatService.getMessages(conversationId, userId, limit ? parseInt(limit) : 50);
    return { success: true, data };
  }

  @Post('messages')
  async sendMessage(@CurrentUser('id') userId: string, @Body() dto: SendMessageDto) {
    const data = await this.chatService.sendMessage(userId, dto);
    this.chatGateway.emitNewMessage(dto.conversationId, data);
    return { success: true, data };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/chat',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { 
      success: true, 
      url: `/uploads/chat/${file.filename}` 
    };
  }
}
