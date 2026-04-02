import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'ChatBox-Support API',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/v1/auth',
        companies: '/api/v1/companies',
        knowledgeBase: '/api/v1/knowledge-base',
        customers: '/api/v1/customers',
        conversations: '/api/v1/conversations',
        channels: '/api/v1/channels',
        escalationRules: '/api/v1/escalation-rules',
        reports: '/api/v1/reports',
        admin: '/api/v1/admin/users',
        operators: '/api/v1/operators',
        dashboard: '/api/v1/dashboard',
        chat: '/api/v1/chat',
      },
    };
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
