import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  getOverview(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getOverview(u.companyId, from, to);
  }

  @Get('conversations')
  getConversationVolume(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getConversationVolume(u.companyId, from, to);
  }

  @Get('agents')
  getAgentPerformance(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getAgentPerformance(u.companyId, from, to);
  }

  @Get('response-times')
  getResponseTimes(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getResponseTimes(u.companyId, from, to);
  }

  @Get('csat')
  getCsat(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getCsat(u.companyId, from, to);
  }

  @Get('channels')
  getChannelBreakdown(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getChannelBreakdown(u.companyId, from, to);
  }

  @Get('recent')
  getRecentConversations(@CurrentUser() u: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getRecentConversations(u.companyId, from, to);
  }

  @Get('export')
  async exportData(
    @CurrentUser() u: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res() res?: any,
  ) {
    const data = await this.reportsService.exportData(u.companyId, from, to);
    const response = res as Response;

    if (format === 'csv') {
      const lines = ['Date,Total,Resolved,Open,Escalated'];
      for (const v of data.volume) {
        lines.push(`${v.date},${v.total},${v.resolved},${v.open},${v.escalated}`);
      }
      response.header('Content-Type', 'text/csv');
      response.header('Content-Disposition', 'attachment; filename=report.csv');
      return response.send(lines.join('\n'));
    }

    response.header('Content-Type', 'application/json');
    response.header('Content-Disposition', 'attachment; filename=report.json');
    return response.send(JSON.stringify(data, null, 2));
  }
}
