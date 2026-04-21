import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProxyService } from './proxy.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('lazer')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Public()
  @Get('proxy')
  getProxy(@Query('target') target: string, @Res() res: Response) {
    return this.proxyService.streamProxy(target, res);
  }

  @Public()
  @Get('proxy/readability')
  async getReadability(@Query('target') target: string) {
    if (!target) return { success: false, error: 'Missing target URL' };
    return this.proxyService.extractArticle(target);
  }

  @Public()
  @Get('proxy/image')
  async getProxyImage(@Query('url') url: string, @Query('referer') referer: string, @Res() res: Response) {
    return this.proxyService.proxyImage(url, referer, res);
  }
}
