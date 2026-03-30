import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    CompanyModule,
    KnowledgeBaseModule,
    CustomerModule,
    ConversationModule,
    ChannelsModule,
    EscalationModule,
    ReportsModule,
    AdminModule,
  ],
})
export class AppModule {}
