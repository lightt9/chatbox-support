import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadRepository } from './leads.repository';

@Module({
  controllers: [LeadsController],
  providers: [LeadRepository, LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
