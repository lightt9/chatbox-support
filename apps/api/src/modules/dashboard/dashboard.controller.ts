import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(
    @CurrentUser('companyId') companyId: string,
    @Query('period') period: string,
  ) {
    const validPeriod = ['24h', '7d', '30d'].includes(period) ? period : '7d';
    return this.dashboardService.getMetrics(companyId, validPeriod as any);
  }

  @Get('conversations')
  getConversations(
    @CurrentUser('companyId') companyId: string,
    @Query('period') period: string,
  ) {
    const validPeriod = ['24h', '7d', '30d'].includes(period) ? period : '7d';
    return this.dashboardService.getConversationsOverTime(companyId, validPeriod as any);
  }

  @Get('agents')
  getAgents(
    @CurrentUser('companyId') companyId: string,
    @Query('period') period: string,
  ) {
    const validPeriod = ['24h', '7d', '30d'].includes(period) ? period : '7d';
    return this.dashboardService.getAgentPerformance(companyId, validPeriod as any);
  }

  @Get('activity')
  getActivity(
    @CurrentUser('companyId') companyId: string,
    @Query('limit') limit: string,
  ) {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
    return this.dashboardService.getActivity(companyId, parsedLimit);
  }

  @Get('leads')
  getLeads(
    @CurrentUser('companyId') companyId: string,
    @Query('period') period: string,
  ) {
    const validPeriod = ['24h', '7d', '30d'].includes(period) ? period : '7d';
    return this.dashboardService.getLeadsSummary(companyId, validPeriod as any);
  }

  @Get('live')
  getLive(@CurrentUser('companyId') companyId: string) {
    return this.dashboardService.getLiveStats(companyId);
  }
}
