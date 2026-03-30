import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getOverview() {
    // TODO: Implement dashboard overview stats
    return { message: 'TODO: Get dashboard overview' };
  }

  @Get('conversations')
  async getConversationMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // TODO: Implement conversation metrics
    return { message: 'TODO: Get conversation metrics' };
  }

  @Get('agents')
  async getAgentPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // TODO: Implement agent performance report
    return { message: 'TODO: Get agent performance report' };
  }

  @Get('resolutions')
  async getResolutionStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // TODO: Implement resolution statistics
    return { message: 'TODO: Get resolution statistics' };
  }

  @Get('channels')
  async getChannelBreakdown(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // TODO: Implement channel breakdown
    return { message: 'TODO: Get channel breakdown' };
  }

  @Get('satisfaction')
  async getCustomerSatisfaction(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // TODO: Implement customer satisfaction report
    return { message: 'TODO: Get customer satisfaction report' };
  }
}
