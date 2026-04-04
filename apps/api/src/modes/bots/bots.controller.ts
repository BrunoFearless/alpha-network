import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BotsService } from './bots.service';
import { BotQueueService } from './bot-queue.service';
import { BotExecutionLogService } from './bot-execution-log.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateBotDto, AddCommandDto, UpdateBotDto } from './dto/bots.dto';

@Controller('bots')
@UseGuards(JwtAuthGuard)
export class BotsController {
  constructor(
    private readonly svc: BotsService, 
    private readonly queue: BotQueueService,
    private readonly logs: BotExecutionLogService,
  ) {}

  @Get()
  async list(@CurrentUser() u: { id: string }) { return { success: true, data: await this.svc.listMine(u.id) }; }

  @Post()
  async create(@CurrentUser() u: { id: string }, @Body() dto: CreateBotDto) { return { success: true, data: await this.svc.create(u.id, dto) }; }

  @Get('marketplace')
  async marketplace(@CurrentUser() _u: { id: string }) {
    return { success: true, data: await this.svc.listMarketplace() };
  }

  @Get(':id/debug/executions')
  async executionLogs(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Query('take') take?: string,
  ) {
    const t = take ? Math.min(100, Math.max(1, parseInt(take, 10) || 40)) : 40;
    return { success: true, data: await this.svc.listExecutionLogs(id, u.id, t) };
  }

  @Get(':id')
  async getOne(@CurrentUser() u: { id: string }, @Param('id') id: string) { return { success: true, data: await this.svc.getOne(id, u.id) }; }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar', {
    fileFilter: (req, file, callback) => {
      if (!file || !file.mimetype.startsWith('image/')) {
        callback(new BadRequestException('Apenas imagens são permitidas'), false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        callback(new BadRequestException('Arquivo maior que 5MB'), false);
        return;
      }
      callback(null, true);
    },
  }))
  async update(
    @CurrentUser() u: { id: string },
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Log file upload
    if (file) {
      console.log(`\n🔼 PATCH /api/v1/bots/${id}`);
      console.log(`   User: ${u.id}`);
      console.log(`   File received: ${file.originalname}`);
      console.log(`   File size: ${file.size} bytes`);
      console.log(`   MIME type: ${file.mimetype}`);
      console.log(`   Body fields: ${JSON.stringify(Object.keys(body))}`);
    }

    // Convert body fields to proper types if file upload
    let dto: UpdateBotDto = body;
    if (file) {
      // When receiving multipart, manually parse if needed
      dto = {
        name: body.name,
        description: body.description,
        customColor: body.customColor,
        prefix: body.prefix,
        builderFlow: body.builderFlow ? typeof body.builderFlow === 'string' ? JSON.parse(body.builderFlow) : body.builderFlow : undefined,
        isPublic: body.isPublic === 'true' ? true : body.isPublic === 'false' ? false : undefined,
      };
      console.log(`   DTO prepared: ${JSON.stringify(dto)}`);
    }
    
    if (file) {
      const result = await this.svc.saveAvatarAndUpdate(id, u.id, file, dto);
      console.log(`   ✅ Update complete, avatar URL: ${result.avatarUrl}\n`);
      return { success: true, data: result };
    }
    return { success: true, data: await this.svc.update(id, u.id, dto) };
  }

  @Post(':id/commands')
  async addCmd(@CurrentUser() u: { id: string }, @Param('id') botId: string, @Body() dto: AddCommandDto) { return { success: true, data: await this.svc.addCommand(botId, u.id, dto) }; }

  @Delete('commands/:id')
  async removeCmd(@CurrentUser() u: { id: string }, @Param('id') id: string) { await this.svc.removeCommand(id, u.id); return { success: true }; }

  @Get('debug/queue/stats')
  async queueStats() {
    return { success: true, data: await this.queue.getStats() };
  }

  @Post('debug/queue/pause')
  async queuePause() {
    await this.queue.pause();
    return { success: true, message: 'Queue paused' };
  }

  @Post('debug/queue/resume')
  async queueResume() {
    await this.queue.resume();
    return { success: true, message: 'Queue resumed' };
  }

  @Post('debug/queue/clean')
  async queueClean(@Query('olderThan') olderThan?: string) {
    const age = olderThan ? parseInt(olderThan, 10) : 86400000;
    await this.queue.cleanOldJobs(age);
    return { success: true, message: 'Queue cleaned' };
  }

  @Get(':id/analytics/stats')
  async analyticsStats(@CurrentUser() u: { id: string }, @Param('id') botId: string) {
    const stats = await this.logs.getDailyStats(botId, u.id);
    return { success: true, data: stats };
  }

  @Get(':id/analytics/timeline')
  async analyticsTimeline(@CurrentUser() u: { id: string }, @Param('id') botId: string) {
    const timeline = await this.logs.getEventTimeline(botId, u.id);
    return { success: true, data: timeline };
  }

  @Get(':id/analytics/triggers')
  async analyticsTriggers(@CurrentUser() u: { id: string }, @Param('id') botId: string) {
    const triggers = await this.logs.getTriggerBreakdown(botId, u.id);
    return { success: true, data: triggers };
  }
}
