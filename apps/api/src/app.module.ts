import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './config/database.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/admin/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { EscalationModule } from './modules/escalation/escalation.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { SettingsModule } from './modules/settings/settings.module';
import { QualityModule } from './modules/quality/quality.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AiModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    AiModule,
    AuthModule,
    CompanyModule,
    KnowledgeBaseModule,
    CustomerModule,
    ConversationModule,
    ChannelsModule,
    EscalationModule,
    ReportsModule,
    AdminModule,
    SettingsModule,
    QualityModule,
    LeadsModule,
    OperatorsModule,
    DashboardModule,
    ChatModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
